'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath, revalidateTag } from 'next/cache'

import { calculateMatchdayPoints } from '@/lib/points'
import { isPlatformAdmin } from '@/lib/auth/test-access'
import { getAdminMatchPredictions, type AdminPredictionView } from '@/lib/queries/admin'
import { getMatchById } from '@/lib/queries/matches'
import { prisma } from '@/lib/prisma'
import { recalculateCompleteScoringForMatch } from '@/lib/scoring/complete'
import {
  recalculateScorerPointsForMatch,
  saveMatchGoals,
} from '@/lib/scoring/scorers-engine'
import { adjustScorersToCount, validateScorerCounts } from '@/lib/scoring/scorers'
import { sendKickoffPushForMatch } from '@/lib/push/kickoff'
import {
  advanceKnockoutTeams,
  recalculateMatchdayPointsForMatch,
} from '@/lib/tournament/points'

export type AdminActionResponse =
  | { ok: true; message: string }
  | { ok: false; error: string }

export type SetMatchResultResponse = AdminActionResponse

async function assertAdmin() {
  const { userId } = await auth()
  if (!userId || userId !== process.env.ADMIN_USER_ID) {
    throw new Error('No autorizado')
  }
}

export async function setMatchResult(
  matchId: number,
  homeScore: number,
  awayScore: number,
  scorers?: { homePlayerIds: string[]; awayPlayerIds: string[] }
): Promise<SetMatchResultResponse> {
  try {
    await assertAdmin()
  } catch {
    return { ok: false, error: 'No tenés permisos de administrador.' }
  }

  if (homeScore < 0 || homeScore > 20 || awayScore < 0 || awayScore > 20) {
    return { ok: false, error: 'Resultados inválidos.' }
  }

  const homeScorerIds = scorers?.homePlayerIds ?? []
  const awayScorerIds = scorers?.awayPlayerIds ?? []

  if (homeScore + awayScore > 0) {
    const scorerError = validateScorerCounts(
      homeScore,
      awayScore,
      homeScorerIds,
      awayScorerIds
    )
    if (scorerError) return { ok: false, error: scorerError }
  }

  const match = await getMatchById(matchId, { includeTestMatches: true })
  if (!match) return { ok: false, error: 'Partido no encontrado.' }

  if (homeScore + awayScore > 0) {
    const allIds = [...homeScorerIds, ...awayScorerIds]
    const players = await prisma.player.findMany({
      where: { id: { in: allIds } },
      select: { id: true, teamId: true },
    })
    const byId = new Map(players.map((p) => [p.id, p.teamId]))
    for (const id of homeScorerIds) {
      if (byId.get(id) !== match.homeTeamId) {
        return { ok: false, error: 'Goleador local inválido.' }
      }
    }
    for (const id of awayScorerIds) {
      if (byId.get(id) !== match.awayTeamId) {
        return { ok: false, error: 'Goleador visitante inválido.' }
      }
    }
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore,
      awayScore,
      status: 'finished',
    },
  })

  await saveMatchGoals(matchId, homeScorerIds, awayScorerIds)

  const predictions = await prisma.prediction.findMany({
    where: { matchId },
  })

  await Promise.all(
    predictions.map((prediction) => {
      const points = calculateMatchdayPoints(
        { predHome: prediction.predHome, predAway: prediction.predAway },
        { homeScore, awayScore }
      )

      return prisma.prediction.update({
        where: { id: prediction.id },
        data: { points },
      })
    })
  )

  await recalculateScorerPointsForMatch(matchId)
  await recalculateMatchdayPointsForMatch(matchId)

  if (!match.isTest && match.round !== 'Group Stage') {
    await advanceKnockoutTeams(
      matchId,
      match.homeTeamId,
      match.awayTeamId,
      homeScore,
      awayScore
    )
  }

  await recalculateCompleteScoringForMatch(matchId)

  revalidateAdminMatchPaths()

  return { ok: true, message: `Resultado guardado: ${homeScore} - ${awayScore}` }
}

export async function updateMatchLiveScore(
  matchId: number,
  homeScore: number,
  awayScore: number,
  scorers?: { homePlayerIds: string[]; awayPlayerIds: string[] },
): Promise<SetMatchResultResponse> {
  try {
    await assertAdmin()
  } catch {
    return { ok: false, error: 'No tenés permisos de administrador.' }
  }

  if (homeScore < 0 || homeScore > 20 || awayScore < 0 || awayScore > 20) {
    return { ok: false, error: 'Resultados inválidos.' }
  }

  const match = await getMatchById(matchId, { includeTestMatches: true })
  if (!match) return { ok: false, error: 'Partido no encontrado.' }
  if (match.status === 'finished') {
    return { ok: false, error: 'El partido ya está finalizado.' }
  }

  const homeScorerIds = adjustScorersToCount(scorers?.homePlayerIds ?? [], homeScore)
  const awayScorerIds = adjustScorersToCount(scorers?.awayPlayerIds ?? [], awayScore)

  if (homeScorerIds.length + awayScorerIds.length > 0) {
    const allIds = [...homeScorerIds, ...awayScorerIds]
    const players = await prisma.player.findMany({
      where: { id: { in: allIds } },
      select: { id: true, teamId: true },
    })
    const byId = new Map(players.map((player) => [player.id, player.teamId]))
    for (const id of homeScorerIds) {
      if (byId.get(id) !== match.homeTeamId) {
        return { ok: false, error: 'Goleador local inválido.' }
      }
    }
    for (const id of awayScorerIds) {
      if (byId.get(id) !== match.awayTeamId) {
        return { ok: false, error: 'Goleador visitante inválido.' }
      }
    }
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore,
      awayScore,
      status: 'live',
    },
  })

  if (homeScore + awayScore > 0) {
    await saveMatchGoals(matchId, homeScorerIds, awayScorerIds)
  }

  revalidateAdminMatchPaths()

  return { ok: true, message: `Marcador en vivo guardado: ${homeScore} - ${awayScore}` }
}

function revalidateAdminMatchPaths() {
  revalidatePath('/')
  revalidatePath('/fixture')
  revalidatePath('/grupos')
  revalidateTag('standings', 'max')
  revalidatePath('/prode')
  revalidatePath('/prode/fecha')
  revalidatePath('/perfil')
  revalidatePath('/prode/completo')
  revalidatePath('/admin')
  revalidatePath('/torneos', 'layout')
}

export async function notifyMatchStarted(matchId: number): Promise<SetMatchResultResponse> {
  try {
    await assertAdmin()
  } catch {
    return { ok: false, error: 'No tenés permisos de administrador.' }
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { status: true, kickoffPushNotifiedAt: true, isTest: true },
  })
  if (!match) return { ok: false, error: 'Partido no encontrado.' }
  if (match.isTest) return { ok: false, error: 'No aplica a partidos de prueba.' }
  if (match.status === 'finished') {
    return { ok: false, error: 'El partido ya finalizó.' }
  }
  if (match.kickoffPushNotifiedAt) {
    return { ok: false, error: 'El aviso de inicio ya fue enviado.' }
  }
  if (match.status !== 'scheduled' && match.status !== 'live') {
    return { ok: false, error: 'No se puede avisar el inicio de este partido.' }
  }

  try {
    const result = await sendKickoffPushForMatch(matchId)
    if (result.skipped) {
      return { ok: false, error: 'No se pudo enviar el aviso de inicio.' }
    }
  } catch (error) {
    console.error('Kickoff push failed after notifyMatchStarted', { matchId, error })
    return { ok: false, error: 'No se pudo enviar el aviso de inicio.' }
  }

  return { ok: true, message: 'Partido en juego y aviso enviado a los administradores.' }
}

export async function recalculateMatchPoints(matchId: number): Promise<SetMatchResultResponse> {
  try {
    await assertAdmin()
  } catch {
    return { ok: false, error: 'No tenés permisos de administrador.' }
  }

  const match = await getMatchById(matchId, { includeTestMatches: true })
  if (!match) return { ok: false, error: 'Partido no encontrado.' }
  if (match.status !== 'finished' || match.homeScore == null || match.awayScore == null) {
    return { ok: false, error: 'Solo se pueden recalcular puntos de partidos finalizados.' }
  }

  const { homeScore, awayScore } = match

  await prisma.prediction.updateMany({
    where: { matchId },
    data: { points: null, pointsScorers: null },
  })

  const predictions = await prisma.prediction.findMany({ where: { matchId } })

  await Promise.all(
    predictions.map((prediction) => {
      const points = calculateMatchdayPoints(
        { predHome: prediction.predHome, predAway: prediction.predAway },
        { homeScore, awayScore }
      )

      return prisma.prediction.update({
        where: { id: prediction.id },
        data: { points },
      })
    })
  )

  await recalculateScorerPointsForMatch(matchId)
  await recalculateMatchdayPointsForMatch(matchId)
  await recalculateCompleteScoringForMatch(matchId)

  revalidateAdminMatchPaths()

  return { ok: true, message: 'Puntos recalculados desde cero.' }
}

export async function setUserTester(
  userId: string,
  isTester: boolean,
): Promise<AdminActionResponse> {
  try {
    await assertAdmin()

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return { ok: false, error: 'Usuario no encontrado.' }
    }

    if (isPlatformAdmin(user)) {
      return { ok: false, error: 'Un admin no puede ser tester.' }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isTester },
    })

    revalidatePath('/admin')
    return {
      ok: true,
      message: isTester
        ? `${user.name} ahora es tester.`
        : `${user.name} ya no es tester.`,
    }
  } catch {
    return { ok: false, error: 'No autorizado o error al actualizar.' }
  }
}

export async function inviteUserAsTester(email: string): Promise<AdminActionResponse> {
  try {
    await assertAdmin()

    const normalized = email.trim().toLowerCase()
    if (!normalized || !normalized.includes('@')) {
      return { ok: false, error: 'Ingresá un email válido.' }
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: normalized, mode: 'insensitive' } },
    })

    if (!user) {
      return {
        ok: false,
        error:
          'No hay ninguna cuenta con ese email. La persona tiene que registrarse primero en ProdeBEB.',
      }
    }

    if (isPlatformAdmin(user)) {
      return { ok: false, error: 'Un admin no puede ser tester.' }
    }

    if (user.isTester) {
      return { ok: true, message: `${user.name} ya es tester.` }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isTester: true },
    })

    revalidatePath('/admin')
    return { ok: true, message: `${user.name} invitado como tester.` }
  } catch {
    return { ok: false, error: 'No autorizado o error al invitar.' }
  }
}

export async function loadAdminMatchPredictions(
  matchId: number,
): Promise<
  { ok: true; predictions: AdminPredictionView[] } | { ok: false; error: string }
> {
  try {
    await assertAdmin()
  } catch {
    return { ok: false, error: 'No tenés permisos de administrador.' }
  }

  const predictions = await getAdminMatchPredictions(matchId)
  return { ok: true, predictions }
}
