import { scorerSlotToId } from '@/lib/scoring/scorers'

export type GoalEvent = {
  isHome: boolean
  scorerId: string | null
}

export function diffGoalEvents({
  previousHomeScore,
  previousAwayScore,
  previousHomeScorers,
  previousAwayScorers,
  nextHomeScore,
  nextAwayScore,
  nextHomeScorers,
  nextAwayScorers,
}: {
  previousHomeScore: number
  previousAwayScore: number
  previousHomeScorers: string[]
  previousAwayScorers: string[]
  nextHomeScore: number
  nextAwayScore: number
  nextHomeScorers: string[]
  nextAwayScorers: string[]
}): GoalEvent[] {
  const events: GoalEvent[] = []

  for (let index = previousHomeScore; index < nextHomeScore; index += 1) {
    events.push({
      isHome: true,
      scorerId: nextHomeScorers[index] ?? null,
    })
  }

  for (let index = previousAwayScore; index < nextAwayScore; index += 1) {
    events.push({
      isHome: false,
      scorerId: nextAwayScorers[index] ?? null,
    })
  }

  return events
}

export function matchGoalsToScorerIds(
  goals: { isHome: boolean; playerId: string | null; isOwnGoal: boolean }[],
): { homeScorerIds: string[]; awayScorerIds: string[] } {
  const homeScorerIds: string[] = []
  const awayScorerIds: string[] = []

  for (const goal of goals) {
    const id = scorerSlotToId(goal)
    if (goal.isHome) homeScorerIds.push(id)
    else awayScorerIds.push(id)
  }

  return { homeScorerIds, awayScorerIds }
}
