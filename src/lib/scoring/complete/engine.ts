import {
  resolveGroupStandingsFromDb,
  resolveGroupStandingsFromPredictions,
  type Standing,
} from '@/lib/bracket'
import { slotsToPredictionsMap } from '@/lib/queries/bracket'
import { getGroupStageMatches } from '@/lib/queries/matches'
import { getAllTeams } from '@/lib/queries/teams'
import { prisma } from '@/lib/prisma'
import { syncTournamentMemberPoints } from '@/lib/tournament/points'

import { calculateChampionPoints } from './champion'
import { recalculateEarlyBonusForEntry } from './early-bonus'
import { buildPredictedTeamIdsInRound, calculateBracketSlotPoints } from './match'
import { countGroupPositionPoints, countR32QualifierPoints } from './positions'

const FINAL_MATCH_ID = 104
const GROUP_STAGE_LAST_MATCH_ID = 72


async function buildPredictedGroupStandings(
  entryId: string,
): Promise<Map<string, Standing[]> | null> {
  const [teams, groupMatches, slots] = await Promise.all([
    getAllTeams(),
    getGroupStageMatches(),
    prisma.bracketSlot.findMany({
      where: { bracketEntryId: entryId, matchId: { lte: GROUP_STAGE_LAST_MATCH_ID } },
    }),
  ])

  const predictions = slotsToPredictionsMap(slots)
  const groups = [...new Set(teams.map((t) => t.group))].sort()
  const map = new Map<string, Standing[]>()

  for (const group of groups) {
    const groupTeams = teams.filter((t) => t.group === group)
    const matches = groupMatches
      .filter((m) => m.group === group)
      .map((m) => ({
        matchId: m.id,
        group: m.group,
        homeName: m.homeTeam!.name,
        awayName: m.awayTeam!.name,
      }))

    map.set(
      group,
      resolveGroupStandingsFromPredictions(groupTeams, matches, predictions, group),
    )
  }

  const totalGroupMatches = groupMatches.length
  const predictedCount = Object.keys(predictions).length
  if (predictedCount < totalGroupMatches) return null

  return map
}

async function loadEntryKnockoutSlots(bracketEntryId: string) {
  return prisma.bracketSlot.findMany({
    where: {
      bracketEntryId,
      match: { round: { not: 'Group Stage' } },
    },
    select: {
      id: true,
      matchId: true,
      predHomeScore: true,
      predAwayScore: true,
      predHomeTeamId: true,
      predAwayTeamId: true,
      predAdvancesTeamId: true,
      match: { select: { round: true } },
    },
  })
}

async function recalculatePositionPointsForEntry(entryId: string): Promise<number> {
  const predictedStandings = await buildPredictedGroupStandings(entryId)
  if (!predictedStandings) {
    await prisma.bracketEntry.update({ where: { id: entryId }, data: { pointsPositions: 0 } })
    return 0
  }

  const [allTeams, groupMatches] = await Promise.all([getAllTeams(), getGroupStageMatches()])
  const groups = [...new Set(allTeams.map((t) => t.group))].sort()

  const finishedGroupStandings = new Map<string, Standing[]>()
  const allGroupStandings = new Map<string, Standing[]>()
  let allGroupsDone = true

  for (const group of groups) {
    const gTeams = allTeams.filter((t) => t.group === group)
    const gMatches = groupMatches.filter((m) => m.group === group)
    const standings = resolveGroupStandingsFromDb(gTeams, gMatches, group)
    allGroupStandings.set(group, standings)

    const isComplete = gMatches.length > 0 && gMatches.every((m) => m.status === 'finished')
    if (isComplete) {
      finishedGroupStandings.set(group, standings)
    } else {
      allGroupsDone = false
    }
  }

  const posPoints = countGroupPositionPoints(predictedStandings, finishedGroupStandings)
  const r32Points = allGroupsDone ? countR32QualifierPoints(predictedStandings, allGroupStandings) : 0
  const pointsPositions = posPoints + r32Points

  await prisma.bracketEntry.update({ where: { id: entryId }, data: { pointsPositions } })
  return pointsPositions
}

async function recalculateChampionPointsForAllEntries(
  winnerTeamId: string | null,
): Promise<string[]> {
  const entries = await prisma.bracketEntry.findMany({
    select: { id: true, userId: true, championId: true },
  })

  const affectedUserIds: string[] = []

  for (const entry of entries) {
    const pointsChampion = calculateChampionPoints(entry.championId, winnerTeamId)
    await prisma.bracketEntry.update({
      where: { id: entry.id },
      data: { pointsChampion },
    })
    affectedUserIds.push(entry.userId)
  }

  return affectedUserIds
}

async function finalizeEntryScoring(entryId: string, userId: string) {
  await recalculateEarlyBonusForEntry(entryId)
  await syncTournamentMemberPoints(userId)
}

export async function recalculateCompleteScoringForMatch(matchId: number): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { homeTeam: true, awayTeam: true },
  })

  if (!match || match.status !== 'finished') return
  if (match.homeScore == null || match.awayScore == null) return

  const slots = await prisma.bracketSlot.findMany({
    where: { matchId },
    select: {
      id: true,
      bracketEntryId: true,
      predHomeScore: true,
      predAwayScore: true,
      predHomeTeamId: true,
      predAwayTeamId: true,
      predAdvancesTeamId: true,
      bracketEntry: { select: { userId: true } },
    },
  })

  const matchInput = {
    round: match.round,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    homeTeamName: match.homeTeam?.name ?? null,
    awayTeamName: match.awayTeam?.name ?? null,
  }

  const affectedEntries = new Map<string, string>()
  const entrySlotsCache = new Map<
    string,
    Awaited<ReturnType<typeof loadEntryKnockoutSlots>>
  >()

  for (const slot of slots) {
    let entrySlots = entrySlotsCache.get(slot.bracketEntryId)
    if (!entrySlots) {
      entrySlots = await loadEntryKnockoutSlots(slot.bracketEntryId)
      entrySlotsCache.set(slot.bracketEntryId, entrySlots)
    }

    const predictedTeamsInRound = buildPredictedTeamIdsInRound(entrySlots, match.round)
    const points = calculateBracketSlotPoints(slot, matchInput, predictedTeamsInRound)

    await prisma.bracketSlot.update({
      where: { id: slot.id },
      data: { points },
    })
    affectedEntries.set(slot.bracketEntryId, slot.bracketEntry.userId)
  }

  if (match.round === 'Group Stage' && match.group) {
    // Trigger position points when this specific group's last match finishes
    const remainingInGroup = await prisma.match.count({
      where: { group: match.group, round: 'Group Stage', status: { not: 'finished' } },
    })
    if (remainingInGroup === 0) {
      const entries = await prisma.bracketEntry.findMany({ select: { id: true, userId: true } })
      for (const entry of entries) {
        await recalculatePositionPointsForEntry(entry.id)
        affectedEntries.set(entry.id, entry.userId)
      }
    }
  }

  if (matchId === FINAL_MATCH_ID && match.homeTeamId && match.awayTeamId) {
    const winnerTeamId =
      match.homeScore > match.awayScore
        ? match.homeTeamId
        : match.awayScore > match.homeScore
          ? match.awayTeamId
          : null

    const userIds = await recalculateChampionPointsForAllEntries(winnerTeamId)
    const allEntries = await prisma.bracketEntry.findMany({
      select: { id: true, userId: true },
    })
    for (const entry of allEntries) {
      if (userIds.includes(entry.userId)) {
        affectedEntries.set(entry.id, entry.userId)
      }
    }
  }

  await Promise.all(
    [...affectedEntries.entries()].map(([entryId, userId]) =>
      finalizeEntryScoring(entryId, userId),
    ),
  )
}

export async function recalculateCompleteScoringForUser(userId: string): Promise<void> {
  const entry = await prisma.bracketEntry.findUnique({
    where: { userId },
    include: { slots: true },
  })

  if (!entry) return

  const finishedMatches = await prisma.match.findMany({
    where: { status: 'finished', homeScore: { not: null }, awayScore: { not: null } },
    include: { homeTeam: true, awayTeam: true },
  })

  const matchById = new Map(finishedMatches.map((m) => [m.id, m]))
  const entryKnockoutSlots = await loadEntryKnockoutSlots(entry.id)

  for (const slot of entry.slots) {
    const match = matchById.get(slot.matchId)
    if (!match || match.homeScore == null || match.awayScore == null) {
      await prisma.bracketSlot.update({ where: { id: slot.id }, data: { points: null } })
      continue
    }

    if (match.round === 'Group Stage') continue

    const predictedTeamsInRound = buildPredictedTeamIdsInRound(entryKnockoutSlots, match.round)
    const points = calculateBracketSlotPoints(
      slot,
      {
        round: match.round,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeTeamName: match.homeTeam?.name ?? null,
        awayTeamName: match.awayTeam?.name ?? null,
      },
      predictedTeamsInRound,
    )

    await prisma.bracketSlot.update({ where: { id: slot.id }, data: { points } })
  }

  await recalculatePositionPointsForEntry(entry.id)

  const final = matchById.get(FINAL_MATCH_ID)
  let winnerTeamId: string | null = null
  if (
    final?.homeTeamId &&
    final.awayTeamId &&
    final.homeScore != null &&
    final.awayScore != null
  ) {
    winnerTeamId =
      final.homeScore > final.awayScore
        ? final.homeTeamId
        : final.awayScore > final.homeScore
          ? final.awayTeamId
          : null
  }

  await prisma.bracketEntry.update({
    where: { id: entry.id },
    data: { pointsChampion: calculateChampionPoints(entry.championId, winnerTeamId) },
  })

  await finalizeEntryScoring(entry.id, userId)
}

export async function recalculateCompletePositionPointsForAllEntries(): Promise<number> {
  const entries = await prisma.bracketEntry.findMany({ select: { id: true, userId: true } })
  for (const entry of entries) {
    await recalculatePositionPointsForEntry(entry.id)
    await syncTournamentMemberPoints(entry.userId)
  }
  return entries.length
}

/** Llamar al confirmar bracket (lock) para sincronizar torneos. */
export async function onBracketLocked(userId: string): Promise<void> {
  const entry = await prisma.bracketEntry.findUnique({ where: { userId } })
  if (!entry) return
  await finalizeEntryScoring(entry.id, userId)
}
