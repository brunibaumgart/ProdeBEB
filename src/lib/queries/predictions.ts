import { testMatchVisibilityFilter } from '@/lib/auth/test-access'
import { prisma } from '@/lib/prisma'
import type { MatchQueryOptions, MatchWithRelations } from '@/lib/queries/matches'

export async function getUserPredictionsMap(userId: string) {
  const predictions = await prisma.prediction.findMany({
    where: { userId },
    include: {
      scorers: { select: { playerId: true, isHome: true, isOwnGoal: true } },
    },
  })

  return new Map(predictions.map((prediction) => [prediction.matchId, prediction]))
}

export type UserMatchPredictionSummary = {
  matchId: number
  predHome: number
  predAway: number
  predPenaltiesWinnerId: string | null
  points: number | null
  pointsScorers: number | null
}

export async function getUserPredictionsForMatchIds(userId: string, matchIds: number[]) {
  if (matchIds.length === 0) return new Map<number, UserMatchPredictionSummary>()

  const predictions = await prisma.prediction.findMany({
    where: {
      userId,
      matchId: { in: matchIds },
    },
    select: {
      matchId: true,
      predHome: true,
      predAway: true,
      predPenaltiesWinnerId: true,
      points: true,
      pointsScorers: true,
    },
  })

  return new Map(predictions.map((prediction) => [prediction.matchId, prediction]))
}

export async function getUserPredictionsWithMatches(userId: string, limit?: number) {
  return prisma.prediction.findMany({
    where: { userId },
    include: {
      match: {
        include: {
          homeTeam: true,
          awayTeam: true,
          venue: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  })
}

export async function getPredictableMatches(
  options: MatchQueryOptions = {}
): Promise<MatchWithRelations[]> {
  return prisma.match.findMany({
    where: {
      status: 'scheduled',
      homeTeamId: { not: null },
      awayTeamId: { not: null },
      ...testMatchVisibilityFilter(options.includeTestMatches ?? false),
    },
    include: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
    },
    orderBy: [{ date: 'asc' }, { id: 'asc' }],
  })
}

export async function getFinishedPredictions(
  userId: string,
  options: MatchQueryOptions = {}
) {
  return prisma.prediction.findMany({
    where: {
      userId,
      match: {
        status: 'finished',
        ...testMatchVisibilityFilter(options.includeTestMatches ?? false),
      },
    },
    include: {
      match: {
        include: {
          homeTeam: true,
          awayTeam: true,
          venue: true,
        },
      },
    },
    orderBy: { match: { date: 'desc' } },
  })
}
