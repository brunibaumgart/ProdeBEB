'use server'

import { revalidatePath } from 'next/cache'

import { canEditBracketEntry, isBracketGloballyLocked, BRACKET_LOCK_LABEL } from '@/lib/bracket/lock'
import {
  isKnockoutPredictionComplete,
  resolveKnockoutAdvancesTeamId,
  resolveKnockoutDecidedIn,
  validateKnockoutPrediction,
  type KnockoutDecidedIn,
} from '@/lib/bracket/knockout-prediction'
import { resolveGroupStandingsFromPredictions } from '@/lib/bracket'
import { resolvePredictedBracket } from '@/lib/bracket/predicted-bracket'
import { getGroupStageMatches, getKnockoutMatches } from '@/lib/queries/matches'
import {
  getBracketEntryForUser,
  getOrCreateBracketEntry,
  slotsToPredictionsMap,
} from '@/lib/queries/bracket'
import { getAllTeams } from '@/lib/queries/teams'
import { requireDbUserForAction } from '@/lib/queries/users'
import { prisma } from '@/lib/prisma'
import { onBracketLocked } from '@/lib/scoring/complete'

export type BracketActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string }

async function assertEditable(userId: string) {
  const entry = await getBracketEntryForUser(userId)
  if (!canEditBracketEntry(entry)) {
    if (isBracketGloballyLocked()) {
      throw new Error(`El Prode Completo cerró (${BRACKET_LOCK_LABEL}).`)
    }
    throw new Error('Tu bracket está bloqueado.')
  }
  return getOrCreateBracketEntry(userId)
}

export async function saveBracketMatchPrediction(
  matchId: number,
  predHome: number,
  predAway: number,
  knockoutExtras?: {
    advancesTeamId?: string | null
    decidedIn?: KnockoutDecidedIn | null
  }
): Promise<BracketActionResult> {
  const auth = await requireDbUserForAction()
  if (!auth.ok) return auth
  const user = auth.user

  if (predHome < 0 || predHome > 20 || predAway < 0 || predAway > 20) {
    return { ok: false, error: 'Los goles deben estar entre 0 y 20.' }
  }

  try {
    const entry = await assertEditable(user.id)
    const match = await prisma.match.findUnique({ where: { id: matchId } })
    if (!match) return { ok: false, error: 'Partido no encontrado.' }

    const isKnockout = match.round !== 'Group Stage'

    let predHomeTeamId: string | null = null
    let predAwayTeamId: string | null = null
    let predAdvancesTeamId: string | null = null
    let predDecidedIn: KnockoutDecidedIn | null = null

    if (isKnockout) {
      const [teams, groupMatches, knockoutMatches, slots] = await Promise.all([
        getAllTeams(),
        getGroupStageMatches(),
        getKnockoutMatches(),
        prisma.bracketSlot.findMany({ where: { bracketEntryId: entry.id } }),
      ])

      const teamByName = new Map(teams.map((t) => [t.name, t]))
      const allPredictions = slotsToPredictionsMap(slots)
      allPredictions[matchId] = { predHome, predAway }

      const groupStandings = new Map<
        string,
        ReturnType<typeof resolveGroupStandingsFromPredictions>
      >()
      const groups = [...new Set(teams.map((t) => t.group))].sort()

      for (const group of groups) {
        const groupTeams = teams.filter((t) => t.group === group)
        const groupMatchData = groupMatches
          .filter((m) => m.group === group)
          .map((m) => ({
            matchId: m.id,
            group: m.group,
            homeName: m.homeTeam!.name,
            awayName: m.awayTeam!.name,
          }))

        groupStandings.set(
          group,
          resolveGroupStandingsFromPredictions(groupTeams, groupMatchData, allPredictions, group)
        )
      }

      const resolved = resolvePredictedBracket(
        groupStandings,
        knockoutMatches.map((m) => ({
          id: m.id,
          homeLabel: m.homeLabel,
          awayLabel: m.awayLabel,
        })),
        allPredictions,
        allPredictions,
        teamByName
      )

      const teamsForMatch = resolved.get(matchId)
      if (!teamsForMatch?.homeTeamId || !teamsForMatch?.awayTeamId) {
        return { ok: false, error: 'Completá las fases anteriores antes de este cruce.' }
      }

      predHomeTeamId = teamsForMatch.homeTeamId
      predAwayTeamId = teamsForMatch.awayTeamId

      const validationError = validateKnockoutPrediction({
        predHome,
        predAway,
        homeTeamId: predHomeTeamId,
        awayTeamId: predAwayTeamId,
        advancesTeamId: knockoutExtras?.advancesTeamId,
        decidedIn: knockoutExtras?.decidedIn,
      })
      if (validationError) return { ok: false, error: validationError }

      predAdvancesTeamId = resolveKnockoutAdvancesTeamId({
        predHome,
        predAway,
        homeTeamId: predHomeTeamId,
        awayTeamId: predAwayTeamId,
        advancesTeamId: knockoutExtras?.advancesTeamId,
      })
      predDecidedIn = resolveKnockoutDecidedIn({
        predHome,
        predAway,
        homeTeamId: predHomeTeamId,
        awayTeamId: predAwayTeamId,
        advancesTeamId: predAdvancesTeamId,
        decidedIn: knockoutExtras?.decidedIn,
      })
    }

    await prisma.bracketSlot.upsert({
      where: {
        bracketEntryId_matchId: {
          bracketEntryId: entry.id,
          matchId,
        },
      },
      create: {
        bracketEntryId: entry.id,
        matchId,
        predHomeScore: predHome,
        predAwayScore: predAway,
        predHomeTeamId,
        predAwayTeamId,
        predAdvancesTeamId,
        predDecidedIn,
      },
      update: {
        predHomeScore: predHome,
        predAwayScore: predAway,
        predHomeTeamId,
        predAwayTeamId,
        predAdvancesTeamId,
        predDecidedIn,
      },
    })

    if (!isKnockout) {
      await prisma.bracketSlot.deleteMany({
        where: { bracketEntryId: entry.id, matchId: { gte: 73 } },
      })
      await prisma.bracketEntry.update({
        where: { id: entry.id },
        data: { championId: null },
      })
    }

    revalidatePath('/prode/completo')
    revalidatePath('/prode')
    revalidatePath('/perfil')

    return { ok: true, message: 'Predicción guardada.' }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Error al guardar.' }
  }
}

export async function saveBracketChampion(championId: string): Promise<BracketActionResult> {
  const auth = await requireDbUserForAction()
  if (!auth.ok) return auth
  const user = auth.user

  try {
    const entry = await assertEditable(user.id)
    const team = await prisma.team.findUnique({ where: { id: championId } })
    if (!team) return { ok: false, error: 'Selección no encontrada.' }

    await prisma.bracketEntry.update({
      where: { id: entry.id },
      data: { championId },
    })

    revalidatePath('/prode/completo')
    revalidatePath('/prode')

    return { ok: true, message: 'Campeón guardado.' }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Error al guardar.' }
  }
}

export async function lockBracket(): Promise<BracketActionResult> {
  const auth = await requireDbUserForAction()
  if (!auth.ok) return auth
  const user = auth.user

  if (isBracketGloballyLocked()) {
    return { ok: false, error: 'El Prode Completo ya cerró.' }
  }

  try {
    const entry = await getOrCreateBracketEntry(user.id)
    if (entry.locked) return { ok: false, error: 'Tu bracket ya está confirmado.' }

    const [groupMatches, knockoutMatches, slots] = await Promise.all([
      getGroupStageMatches(),
      getKnockoutMatches(),
      prisma.bracketSlot.findMany({ where: { bracketEntryId: entry.id } }),
    ])

    const predictions = slotsToPredictionsMap(slots)
    const missingGroup = groupMatches.filter((m) => !predictions[m.id])
    if (missingGroup.length > 0) {
      return {
        ok: false,
        error: `Faltan ${missingGroup.length} resultados de fase de grupos.`,
      }
    }

    const incompleteKnockout = knockoutMatches.filter((m) => {
      const pred = predictions[m.id]
      if (!pred) return true
      return !isKnockoutPredictionComplete({
        predHome: pred.predHome,
        predAway: pred.predAway,
        advancesTeamId: pred.predAdvancesTeamId,
      })
    })
    if (incompleteKnockout.length > 0) {
      return {
        ok: false,
        error: `Faltan ${incompleteKnockout.length} eliminatorias (revisá empates en 90' con prórroga/penales).`,
      }
    }

    if (!entry.championId) {
      return { ok: false, error: 'Elegí un campeón antes de confirmar.' }
    }

    await prisma.bracketEntry.update({
      where: { id: entry.id },
      data: { locked: true, lockedAt: new Date() },
    })

    await onBracketLocked(user.id)

    revalidatePath('/prode/completo')
    revalidatePath('/prode')
    revalidatePath('/perfil')

    return { ok: true, message: 'Bracket confirmado. ¡Suerte!' }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Error al confirmar.' }
  }
}
