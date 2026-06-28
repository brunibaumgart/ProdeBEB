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
import { adjustScorersToCount, validateScorerCounts, isOwnGoalSentinel } from '@/lib/scoring/scorers'
import { sendKickoffPushForMatch } from '@/lib/push/kickoff'
import { diffGoalEvents, matchGoalsToScorerIds } from '@/lib/push/goal-events'
import { sendGoalPushForMatchId } from '@/lib/push/goal'
import { sendMatchFinishedPushForMatchId } from '@/lib/push/match-finished'
import {
  advanceKnockoutTeams,
  recalculateMatchdayPointsForMatch,
} from '@/lib/tournament/points'
import { recalculateAllPointsForFinishedMatches } from '@/lib/tournament/recalculate-all'
import { recalculateCompletePositionPointsForAllEntries } from '@/lib/scoring/complete'
import { populateR32TeamsFromGroupStandings } from '@/lib/tournament/populate-r32-teams'

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
  const justFinished = match.status !== 'finished'

  if (homeScore + awayScore > 0) {
    const allIds = [...homeScorerIds, ...awayScorerIds].filter((id) => !isOwnGoalSentinel(id))
    const players = await prisma.player.findMany({
      where: { id: { in: allIds } },
      select: { id: true, teamId: true },
    })
    const byId = new Map(players.map((p) => [p.id, p.teamId]))
    for (const id of homeScorerIds) {
      if (isOwnGoalSentinel(id)) continue
      if (byId.get(id) !== match.homeTeamId) {
        return { ok: false, error: 'Goleador local inválido.' }
      }
    }
    for (const id of awayScorerIds) {
      if (isOwnGoalSentinel(id)) continue
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

  const previousScorers = await getExistingMatchGoalScorers(matchId)
  const wasLive = match.status === 'live'

  await saveMatchGoals(matchId, homeScorerIds, awayScorerIds)

  if (!match.isTest && wasLive) {
    await notifyNewGoalsIfNeeded(
      matchId,
      {
        homeScore: match.homeScore ?? 0,
        awayScore: match.awayScore ?? 0,
        homeScorerIds: previousScorers.homeScorerIds,
        awayScorerIds: previousScorers.awayScorerIds,
      },
      {
        homeScore,
        awayScore,
        homeScorerIds,
        awayScorerIds,
      },
    )
  }

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

  if (!match.isTest && justFinished) {
    try {
      await sendMatchFinishedPushForMatchId(matchId, homeScore, awayScore)
    } catch (error) {
      console.error('Match finished push failed', { matchId, error })
    }
  }

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
    const allIds = [...homeScorerIds, ...awayScorerIds].filter((id) => !isOwnGoalSentinel(id))
    const players = await prisma.player.findMany({
      where: { id: { in: allIds } },
      select: { id: true, teamId: true },
    })
    const byId = new Map(players.map((player) => [player.id, player.teamId]))
    for (const id of homeScorerIds) {
      if (isOwnGoalSentinel(id)) continue
      if (byId.get(id) !== match.homeTeamId) {
        return { ok: false, error: 'Goleador local inválido.' }
      }
    }
    for (const id of awayScorerIds) {
      if (isOwnGoalSentinel(id)) continue
      if (byId.get(id) !== match.awayTeamId) {
        return { ok: false, error: 'Goleador visitante inválido.' }
      }
    }
  }

  const previousScorers = await getExistingMatchGoalScorers(matchId)

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

  if (!match.isTest) {
    await notifyNewGoalsIfNeeded(
      matchId,
      {
        homeScore: match.homeScore ?? 0,
        awayScore: match.awayScore ?? 0,
        homeScorerIds: previousScorers.homeScorerIds,
        awayScorerIds: previousScorers.awayScorerIds,
      },
      {
        homeScore,
        awayScore,
        homeScorerIds,
        awayScorerIds,
      },
    )
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

async function notifyNewGoalsIfNeeded(
  matchId: number,
  previous: {
    homeScore: number
    awayScore: number
    homeScorerIds: string[]
    awayScorerIds: string[]
  },
  next: {
    homeScore: number
    awayScore: number
    homeScorerIds: string[]
    awayScorerIds: string[]
  },
) {
  const events = diffGoalEvents({
    previousHomeScore: previous.homeScore,
    previousAwayScore: previous.awayScore,
    previousHomeScorers: previous.homeScorerIds,
    previousAwayScorers: previous.awayScorerIds,
    nextHomeScore: next.homeScore,
    nextAwayScore: next.awayScore,
    nextHomeScorers: next.homeScorerIds,
    nextAwayScorers: next.awayScorerIds,
  })

  if (events.length === 0) return

  try {
    await sendGoalPushForMatchId(matchId, events, next.homeScore, next.awayScore)
  } catch (error) {
    console.error('Goal push failed', { matchId, events, error })
  }
}

async function getExistingMatchGoalScorers(matchId: number) {
  const goals = await prisma.matchGoal.findMany({
    where: { matchId },
    orderBy: [{ isHome: 'desc' }, { id: 'asc' }],
    select: { isHome: true, playerId: true, isOwnGoal: true },
  })

  return matchGoalsToScorerIds(goals)
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

export async function resendMatchFinishedPush(matchId: number): Promise<SetMatchResultResponse> {
  try {
    await assertAdmin()
  } catch {
    return { ok: false, error: 'No tenés permisos de administrador.' }
  }

  const match = await getMatchById(matchId, { includeTestMatches: true })
  if (!match) return { ok: false, error: 'Partido no encontrado.' }
  if (match.isTest) return { ok: false, error: 'Los partidos amistosos no envían esta notificación.' }
  if (match.status !== 'finished' || match.homeScore == null || match.awayScore == null) {
    return { ok: false, error: 'Solo se puede reenviar en partidos finalizados con marcador.' }
  }

  const { sent, failed } = await sendMatchFinishedPushForMatchId(
    matchId,
    match.homeScore,
    match.awayScore
  )

  return {
    ok: true,
    message: `Notificación reenviada: ${sent} dispositivo${sent === 1 ? '' : 's'} ok, ${failed} falló${failed === 1 ? '' : 'aron'}.`,
  }
}

export async function adminRecalculateAllFinishedMatchesPoints(): Promise<SetMatchResultResponse> {
  try {
    await assertAdmin()
  } catch {
    return { ok: false, error: 'No tenés permisos de administrador.' }
  }

  const result = await recalculateAllPointsForFinishedMatches()

  revalidateAdminMatchPaths()

  return {
    ok: true,
    message: `Recálculo listo: ${result.predictionsUpdated} predicción${result.predictionsUpdated === 1 ? '' : 'es'} actualizada${result.predictionsUpdated === 1 ? '' : 's'} en ${result.matchesProcessed} partido${result.matchesProcessed === 1 ? '' : 's'} (${result.usersSynced} usuario${result.usersSynced === 1 ? '' : 's'} sincronizado${result.usersSynced === 1 ? '' : 's'}).`,
  }
}

export async function adminPopulateR32Teams(): Promise<SetMatchResultResponse> {
  try {
    await assertAdmin()
  } catch {
    return { ok: false, error: 'No tenés permisos de administrador.' }
  }

  const updated = await populateR32TeamsFromGroupStandings()

  revalidateAdminMatchPaths()

  return {
    ok: true,
    message: `${updated} partido${updated === 1 ? '' : 's'} de 16avos actualizado${updated === 1 ? '' : 's'} con los equipos confirmados.`,
  }
}

export async function adminRecalculateCompletePositionPoints(): Promise<SetMatchResultResponse> {
  try {
    await assertAdmin()
  } catch {
    return { ok: false, error: 'No tenés permisos de administrador.' }
  }

  const count = await recalculateCompletePositionPointsForAllEntries()

  revalidateAdminMatchPaths()

  return {
    ok: true,
    message: `Puntos de posiciones del Completo recalculados para ${count} entrada${count === 1 ? '' : 's'}.`,
  }
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
