import {
  calculateScorerPoints,
  scorerSlotFromId,
  type ScorerGoalEntry,
} from '@/lib/scoring/scorers'
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

  const actualEntries: ScorerGoalEntry[] = matchGoals.map((goal) => ({
    playerId: goal.playerId,
    isOwnGoal: goal.isOwnGoal,
    isHome: goal.isHome,
  }))

  const positionByPlayerId = new Map(
    matchGoals
      .filter((goal) => goal.player)
      .map((goal) => [goal.player!.id, goal.player!.position])
  )

  const predictedPlayerIds = [
    ...new Set(
      predictions.flatMap((prediction) =>
        prediction.scorers.filter((scorer) => scorer.playerId).map((scorer) => scorer.playerId!)
      )
    ),
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
    const predictedEntries: ScorerGoalEntry[] = prediction.scorers.map((scorer) => ({
      playerId: scorer.playerId,
      isOwnGoal: scorer.isOwnGoal,
      isHome: scorer.isHome,
    }))

    const pointsScorers =
      matchGoals.length === 0 && predictedEntries.length === 0
        ? 0
        : calculateScorerPoints(predictedEntries, actualEntries, positionByPlayerId)

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
    ...homeScorerIds.map((playerId) => ({
      matchId,
      ...scorerSlotFromId(playerId),
      isHome: true,
    })),
    ...awayScorerIds.map((playerId) => ({
      matchId,
      ...scorerSlotFromId(playerId),
      isHome: false,
    })),
  ]

  if (goals.length > 0) {
    await prisma.matchGoal.createMany({ data: goals })
  }
}
