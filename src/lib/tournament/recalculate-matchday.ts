import { calculateMatchdayPoints } from '@/lib/points'
import { prisma } from '@/lib/prisma'

import { syncTournamentMemberPoints } from './points'

export type RecalculateAllMatchdayResult = {
  matchesProcessed: number
  predictionsChecked: number
  predictionsUpdated: number
  usersSynced: number
}

/** Recalcula Prediction.points de todos los partidos finalizados (no test) y sincroniza torneos. */
export async function recalculateAllFinishedMatchdayPoints(): Promise<RecalculateAllMatchdayResult> {
  const matches = await prisma.match.findMany({
    where: {
      isTest: false,
      status: 'finished',
      homeScore: { not: null },
      awayScore: { not: null },
    },
    select: { id: true, homeScore: true, awayScore: true },
    orderBy: { id: 'asc' },
  })

  const affectedUserIds = new Set<string>()
  let predictionsChecked = 0
  let predictionsUpdated = 0

  for (const match of matches) {
    const homeScore = match.homeScore!
    const awayScore = match.awayScore!
    const predictions = await prisma.prediction.findMany({
      where: { matchId: match.id },
      select: { id: true, userId: true, predHome: true, predAway: true, points: true },
    })

    for (const prediction of predictions) {
      predictionsChecked += 1
      const newPoints = calculateMatchdayPoints(
        { predHome: prediction.predHome, predAway: prediction.predAway },
        { homeScore, awayScore },
      )

      if (prediction.points !== newPoints) {
        await prisma.prediction.update({
          where: { id: prediction.id },
          data: { points: newPoints },
        })
        predictionsUpdated += 1
        affectedUserIds.add(prediction.userId)
      }
    }
  }

  await Promise.all([...affectedUserIds].map((userId) => syncTournamentMemberPoints(userId)))

  return {
    matchesProcessed: matches.length,
    predictionsChecked,
    predictionsUpdated,
    usersSynced: affectedUserIds.size,
  }
}
