import { prisma } from '@/lib/prisma'
import { recalculateCompleteScoringForMatch } from '@/lib/scoring/complete'
import { recalculateScorerPointsForMatch } from '@/lib/scoring/scorers-engine'

import { recalculateAllFinishedMatchdayPoints } from './recalculate-matchday'

export type RecalculateAllPointsResult = {
  matchesProcessed: number
  predictionsChecked: number
  predictionsUpdated: number
  usersSynced: number
}

/**
 * Recalcula con el criterio actual los puntos (fecha a fecha, goleadores y completo) de
 * todos los partidos ya finalizados. Útil al sumar predicciones cargadas a mano para
 * gente que se incorpora después de que esos partidos ya terminaron.
 */
export async function recalculateAllPointsForFinishedMatches(): Promise<RecalculateAllPointsResult> {
  const matchdayResult = await recalculateAllFinishedMatchdayPoints()

  const matches = await prisma.match.findMany({
    where: {
      isTest: false,
      status: 'finished',
      homeScore: { not: null },
      awayScore: { not: null },
    },
    select: { id: true },
    orderBy: { id: 'asc' },
  })

  for (const match of matches) {
    await recalculateScorerPointsForMatch(match.id)
    await recalculateCompleteScoringForMatch(match.id)
  }

  return { ...matchdayResult, matchesProcessed: matches.length }
}
