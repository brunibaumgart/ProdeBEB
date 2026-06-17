import type { Standing } from '@/lib/bracket'
import { encodeKnockoutWinner } from '@/lib/bracket/match-outcome'
import { resolveGroupStandingsFromPredictions } from '@/lib/bracket'
import { KNOCKOUT_MOBILE_TAB_ROUNDS } from '@/lib/bracket/knockout-bracket-layout'
import { resolvePredictedBracket } from '@/lib/bracket/predicted-bracket'
import {
  isThirdPlaceTiebreakComplete,
  sanitizeThirdPlaceTiebreakOrder,
  type ThirdPlaceTiebreakOrder,
} from '@/lib/bracket/third-place-tiebreak'
import type { BracketSlotPrediction } from '@/lib/queries/bracket'

import type { CelebrityBracket, CelebrityBracketSource } from './types'

const GROUPS = 'ABCDEFGHIJKL'.split('')
const GROUP_MATCH_COUNT = 72

export type BuildCelebrityContext = {
  teams: {
    id: string
    name: string
    nameEs: string
    group: string
    iso2: string
    flagEmoji: string
  }[]
  groupMatches: {
    id: number
    group: string | null
    homeTeam: { name: string; nameEs: string } | null
    awayTeam: { name: string; nameEs: string } | null
  }[]
  knockoutMatches: {
    id: number
    homeLabel: string | null
    awayLabel: string | null
  }[]
}

function normalizeLookup(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function resolveTeam(
  teamRef: string,
  teams: BuildCelebrityContext['teams'],
): BuildCelebrityContext['teams'][number] | null {
  const key = normalizeLookup(teamRef)
  return (
    teams.find(
      (entry) =>
        normalizeLookup(entry.name) === key || normalizeLookup(entry.nameEs) === key,
    ) ?? null
  )
}

function buildManualStandings(
  orderNameEs: string[],
  teams: BuildCelebrityContext['teams'],
): Standing[] {
  return orderNameEs.map((nameEs, index) => {
    const team = resolveTeam(nameEs, teams)
    const position = index + 1
    return {
      teamName: team?.name ?? nameEs,
      played: 3,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: Math.max(0, (5 - position) * 2),
      team: team
        ? { nameEs: team.nameEs, iso2: team.iso2, flagEmoji: team.flagEmoji }
        : undefined,
    }
  })
}

function findKnockoutMatchByWinner(
  winnerName: string,
  roundMatchIds: number[],
  resolvedKnockout: Map<
    number,
    { homeTeamName: string | null; awayTeamName: string | null }
  >,
): number | null {
  for (const matchId of roundMatchIds) {
    const matchup = resolvedKnockout.get(matchId)
    if (!matchup?.homeTeamName || !matchup?.awayTeamName) continue
    if (matchup.homeTeamName === winnerName || matchup.awayTeamName === winnerName) {
      return matchId
    }
  }

  return null
}

function applyCelebrityKnockoutPicks(
  source: CelebrityBracketSource,
  ctx: BuildCelebrityContext,
  predictions: Record<number, BracketSlotPrediction>,
  groupStandings: Map<string, Standing[]>,
  tiebreakOrder: ThirdPlaceTiebreakOrder,
  teamByName: Map<string, BuildCelebrityContext['teams'][number]>,
): void {
  let pickIndex = 0
  const rounds = KNOCKOUT_MOBILE_TAB_ROUNDS

  for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
    const round = rounds[roundIndex]!
    const remainingPicks = source.knockoutPicks.length - pickIndex
    const roundsLeft = rounds.length - roundIndex
    if (remainingPicks < roundsLeft) continue

    const roundPicks = source.knockoutPicks.slice(
      pickIndex,
      pickIndex + round.matchIds.length,
    )
    pickIndex += round.matchIds.length
    if (roundPicks.length === 0) break

    const resolvedKnockout = resolvePredictedBracket(
      groupStandings,
      ctx.knockoutMatches,
      predictions,
      predictions,
      teamByName,
      tiebreakOrder,
    )

    const applyWinner = (matchId: number, winnerId: string, homeTeamId: string) => {
      const { predHome, predAway } = encodeKnockoutWinner(winnerId, homeTeamId)
      predictions[matchId] = {
        predHome,
        predAway,
        predAdvancesTeamId: winnerId,
        predDecidedIn: 'regulation',
      }
    }

    for (const pick of roundPicks) {
      const winner = resolveTeam(pick.winner, ctx.teams)
      if (!winner) continue

      const matchId = findKnockoutMatchByWinner(
        winner.name,
        round.matchIds,
        resolvedKnockout,
      )
      if (!matchId) continue

      const matchup = resolvedKnockout.get(matchId)
      if (!matchup?.homeTeamId || !matchup?.awayTeamId) continue

      applyWinner(matchId, winner.id, matchup.homeTeamId)
    }

    // Si el famoso nombró al perdedor con otro rival (ej. "Alemania le gana a Corea"),
    // el perdedor puede estar en otro cruce de la misma ronda.
    for (const pick of roundPicks) {
      const loser = resolveTeam(pick.loser, ctx.teams)
      if (!loser) continue

      const matchId = findKnockoutMatchByWinner(loser.name, round.matchIds, resolvedKnockout)
      if (!matchId || predictions[matchId]) continue

      const matchup = resolvedKnockout.get(matchId)
      if (!matchup?.homeTeamId || !matchup?.awayTeamId) continue

      const winnerId =
        matchup.homeTeamId === loser.id ? matchup.awayTeamId : matchup.homeTeamId
      applyWinner(matchId, winnerId, matchup.homeTeamId)
    }
  }
}

function buildThirdPlaceOrder(
  source: CelebrityBracketSource,
  groupStandings: Map<string, Standing[]>,
  teams: BuildCelebrityContext['teams'],
): ThirdPlaceTiebreakOrder {
  if (!source.thirdPlaceOrder?.length) return {}

  const order: ThirdPlaceTiebreakOrder = {}
  for (const teamRef of source.thirdPlaceOrder) {
    const team = resolveTeam(teamRef, teams)
    if (!team) continue

    const standings = groupStandings.get(team.group)
    const third = standings?.[2]
    if (!third) continue
    const matchesTeam =
      normalizeLookup(third.team?.nameEs ?? third.teamName) === normalizeLookup(teamRef) ||
      normalizeLookup(third.teamName) === normalizeLookup(teamRef)
    if (!matchesTeam) continue

    const key = String(third.points)
    const bucket = order[key] ?? []
    if (!bucket.includes(third.teamName)) {
      bucket.push(third.teamName)
    }
    order[key] = bucket
  }

  return order
}

function buildGroupStandings(
  source: CelebrityBracketSource,
  ctx: BuildCelebrityContext,
  predictions: Record<number, BracketSlotPrediction>,
): Map<string, Standing[]> {
  const map = new Map<string, Standing[]>()

  if (source.groupStandingsOrder) {
    for (const [group, order] of Object.entries(source.groupStandingsOrder)) {
      map.set(group, buildManualStandings(order, ctx.teams))
    }
    return map
  }

  for (const group of GROUPS) {
    const groupTeams = ctx.teams.filter((team) => team.group === group)
    const matches = ctx.groupMatches
      .filter((match) => match.group === group)
      .map((match) => ({
        matchId: match.id,
        group: match.group!,
        homeName: match.homeTeam!.name,
        awayName: match.awayTeam!.name,
      }))

    map.set(
      group,
      resolveGroupStandingsFromPredictions(groupTeams, matches, predictions, group),
    )
  }

  return map
}

export function buildCelebrityBracket(
  source: CelebrityBracketSource,
  ctx: BuildCelebrityContext,
): CelebrityBracket {
  const predictions: Record<number, BracketSlotPrediction> = {}

  if (source.groupScores) {
    for (const [matchId, score] of Object.entries(source.groupScores)) {
      predictions[Number(matchId)] = {
        predHome: score.predHome,
        predAway: score.predAway,
      }
    }
  }

  const teamByName = new Map(ctx.teams.map((team) => [team.name, team]))
  const groupStandings = buildGroupStandings(source, ctx, predictions)

  const tiebreakOrder = sanitizeThirdPlaceTiebreakOrder(
    groupStandings,
    buildThirdPlaceOrder(source, groupStandings, ctx.teams),
  )

  applyCelebrityKnockoutPicks(
    source,
    ctx,
    predictions,
    groupStandings,
    tiebreakOrder,
    teamByName,
  )

  const groupPredictionCount = Object.keys(predictions).filter(
    (id) => Number(id) <= GROUP_MATCH_COUNT,
  ).length
  const groupsComplete =
    source.groupInputMode === 'standings-only' || groupPredictionCount >= GROUP_MATCH_COUNT

  const tiebreakComplete = isThirdPlaceTiebreakComplete(groupStandings, tiebreakOrder)
  const knockoutComplete = ctx.knockoutMatches.every((match) => predictions[match.id] != null)

  return {
    ...source,
    predictions,
    tiebreakOrder,
    groupStandings,
    groupsComplete,
    tiebreakComplete,
    knockoutComplete,
    championTeamId: resolveTeam(source.championNameEs, ctx.teams)?.id ?? null,
  }
}
