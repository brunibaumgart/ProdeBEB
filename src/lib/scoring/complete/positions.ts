import type { Standing } from '@/lib/bracket'
import { COMPLETE_POINTS_EXACT_POSITION } from '@/lib/points'

export function standingsToRankMap(standings: Standing[]): Map<string, number> {
  const map = new Map<string, number>()
  standings.forEach((standing, index) => {
    map.set(standing.teamName, index + 1)
  })
  return map
}

export function countPositionPoints(
  predictedStandings: Map<string, Standing[]>,
  actualStandings: Map<string, Standing[]>
): number {
  let points = 0

  for (const [groupKey, actual] of actualStandings) {
    const predicted = predictedStandings.get(groupKey)
    if (!predicted) continue

    const predictedRanks = standingsToRankMap(predicted)
    const actualRanks = standingsToRankMap(actual)

    for (const [teamName, actualRank] of actualRanks) {
      if (predictedRanks.get(teamName) === actualRank) {
        points += COMPLETE_POINTS_EXACT_POSITION
      }
    }
  }

  return points
}
