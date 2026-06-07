import { calculateScorerPoints } from '@/lib/scoring/scorers'
import { prisma } from '@/lib/prisma'
import { syncTournamentMemberPoints } from '@/lib/tournament/points'

export async function recalculateScorerPointsForMatch(matchId: number): Promise<void> {
  const [matchGoals, predictions] = await Promise.all([
    prisma.matchGoal.findMany({
      where: { matchId },
      include: { player: { select: { id: true, position: true } } },
    }),
    prisma.prediction.findMany({
      where: { matchId },
      include: { scorers: true },
    }),
  ])

  const actualPlayerIds = new Set(matchGoals.map((goal) => goal.playerId))
  const positionByPlayerId = new Map(
    matchGoals.map((goal) => [goal.player.id, goal.player.position])
  )

  // Incluir posiciones de jugadores predichos aunque no hayan marcado (para lookup)
  const predictedPlayerIds = [
    ...new Set(predictions.flatMap((p) => p.scorers.map((s) => s.playerId))),
  ]
  if (predictedPlayerIds.length > 0) {
    const players = await prisma.player.findMany({
      where: { id: { in: predictedPlayerIds } },
      select: { id: true, position: true },
    })
    for (const player of players) {
      positionByPlayerId.set(player.id, player.position)
    }
  }

  const affectedUserIds = new Set<string>()

  for (const prediction of predictions) {
    const predictedIds = prediction.scorers.map((s) => s.playerId)
    const pointsScorers =
      matchGoals.length === 0 && predictedIds.length === 0
        ? 0
        : calculateScorerPoints(predictedIds, actualPlayerIds, positionByPlayerId)

    await prisma.prediction.update({
      where: { id: prediction.id },
      data: { pointsScorers },
    })
    affectedUserIds.add(prediction.userId)
  }

  await Promise.all([...affectedUserIds].map((userId) => syncTournamentMemberPoints(userId)))
}

export async function saveMatchGoals(
  matchId: number,
  homeScorerIds: string[],
  awayScorerIds: string[]
): Promise<void> {
  await prisma.matchGoal.deleteMany({ where: { matchId } })

  const goals = [
    ...homeScorerIds.map((playerId) => ({ matchId, playerId, isHome: true })),
    ...awayScorerIds.map((playerId) => ({ matchId, playerId, isHome: false })),
  ]

  if (goals.length > 0) {
    await prisma.matchGoal.createMany({ data: goals })
  }
}
