'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

import { canAccessTestContent } from '@/lib/auth/test-access'
import { requireDbUserForAction } from '@/lib/queries/users'
import { canEditPrediction, isMatchPredictable } from '@/lib/matches/availability'
import { getMatchById } from '@/lib/queries/matches'
import { validateOptionalScorerCounts, isOwnGoalSentinel, scorerSlotFromId } from '@/lib/scoring/scorers'
import { prisma } from '@/lib/prisma'

export type SavePredictionResult =
  | { ok: true; message: string }
  | { ok: false; error: string }

async function upsertPredictionScorers(
  predictionId: string,
  homeScorerIds: string[],
  awayScorerIds: string[]
) {
  await prisma.predictionScorer.deleteMany({ where: { predictionId } })

  const rows = [
    ...homeScorerIds.filter(Boolean).map((playerId) => ({
      predictionId,
      isHome: true,
      ...scorerSlotFromId(playerId),
    })),
    ...awayScorerIds.filter(Boolean).map((playerId) => ({
      predictionId,
      isHome: false,
      ...scorerSlotFromId(playerId),
    })),
  ]

  if (rows.length > 0) {
    await prisma.predictionScorer.createMany({ data: rows })
  }
}

export async function savePrediction(
  matchId: number,
  predHome: number,
  predAway: number,
  scorers?: { homePlayerIds: string[]; awayPlayerIds: string[] },
  predPenaltiesWinnerId?: string | null,
): Promise<SavePredictionResult> {
  const dbUser = await requireDbUserForAction()
  if (!dbUser.ok) return dbUser
  const user = dbUser.user

  if (predHome < 0 || predHome > 20 || predAway < 0 || predAway > 20) {
    return { ok: false, error: 'Los goles deben estar entre 0 y 20.' }
  }

  const homeScorerIds = scorers?.homePlayerIds ?? []
  const awayScorerIds = scorers?.awayPlayerIds ?? []

  const scorerError = validateOptionalScorerCounts(
    predHome,
    predAway,
    homeScorerIds,
    awayScorerIds
  )
  if (scorerError) return { ok: false, error: scorerError }

  const { userId: clerkId } = await auth()
  const includeTestMatches = await canAccessTestContent(clerkId)

  const match = await getMatchById(matchId, { includeTestMatches })
  if (!match) return { ok: false, error: 'Partido no encontrado.' }

  if (match.isTest && !includeTestMatches) {
    return { ok: false, error: 'Partido no disponible.' }
  }

  if (!isMatchPredictable(match)) {
    return { ok: false, error: 'Este partido aún no está disponible para predecir.' }
  }

  if (!canEditPrediction(match)) {
    return { ok: false, error: 'Las predicciones para este partido ya están cerradas.' }
  }

  if (homeScorerIds.length > 0 || awayScorerIds.length > 0) {
    const playerIds = [...homeScorerIds, ...awayScorerIds].filter((id) => !isOwnGoalSentinel(id))
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, teamId: true },
    })
    const playerTeamMap = new Map(players.map((p) => [p.id, p.teamId]))

    for (const playerId of homeScorerIds) {
      if (isOwnGoalSentinel(playerId)) continue
      if (playerTeamMap.get(playerId) !== match.homeTeamId) {
        return { ok: false, error: 'Goleador local inválido para este partido.' }
      }
    }
    for (const playerId of awayScorerIds) {
      if (isOwnGoalSentinel(playerId)) continue
      if (playerTeamMap.get(playerId) !== match.awayTeamId) {
        return { ok: false, error: 'Goleador visitante inválido para este partido.' }
      }
    }
  }

  const isKnockout = match.round !== 'Group Stage'
  const isDraw = predHome === predAway
  const penaltiesWinner = isKnockout && isDraw ? (predPenaltiesWinnerId ?? null) : null

  const prediction = await prisma.prediction.upsert({
    where: {
      userId_matchId: {
        userId: user.id,
        matchId,
      },
    },
    create: {
      userId: user.id,
      matchId,
      predHome,
      predAway,
      predPenaltiesWinnerId: penaltiesWinner,
    },
    update: {
      predHome,
      predAway,
      predPenaltiesWinnerId: penaltiesWinner,
    },
  })

  await upsertPredictionScorers(prediction.id, homeScorerIds, awayScorerIds)

  revalidatePath('/prode')
  revalidatePath('/prode/fecha')
  revalidatePath('/perfil')

  return { ok: true, message: 'Predicción guardada.' }
}
