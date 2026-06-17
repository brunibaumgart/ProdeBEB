import { getBestThirds, type Standing } from '@/lib/bracket'

import {
  COMPLETE_POINTS_EXACT_GROUP_POSITION,
  COMPLETE_POINTS_R32_QUALIFIER,
} from './rules'

export function standingsToRankMap(standings: Standing[]): Map<string, number> {
  const map = new Map<string, number>()
  standings.forEach((standing, index) => {
    map.set(standing.teamName, index + 1)
  })
  return map
}

export function getRoundOf32TeamNames(standings: Map<string, Standing[]>): Set<string> {
  const names = new Set<string>()

  for (const groupStandings of standings.values()) {
    if (groupStandings[0]) names.add(groupStandings[0].teamName)
    if (groupStandings[1]) names.add(groupStandings[1].teamName)
  }

  for (const standing of getBestThirds(standings, 8)) {
    names.add(standing.teamName)
  }

  return names
}

export function countPositionPoints(
  predictedStandings: Map<string, Standing[]>,
  actualStandings: Map<string, Standing[]>,
): number {
  let points = 0

  const actualR32 = getRoundOf32TeamNames(actualStandings)
  const predictedR32 = getRoundOf32TeamNames(predictedStandings)

  for (const teamName of actualR32) {
    if (predictedR32.has(teamName)) {
      points += COMPLETE_POINTS_R32_QUALIFIER
    }
  }

  for (const [groupKey, actual] of actualStandings) {
    const predicted = predictedStandings.get(groupKey)
    if (!predicted) continue

    const predictedRanks = standingsToRankMap(predicted)
    const actualRanks = standingsToRankMap(actual)

    for (const [teamName, actualRank] of actualRanks) {
      if (predictedRanks.get(teamName) === actualRank) {
        points += COMPLETE_POINTS_EXACT_GROUP_POSITION
      }
    }
  }

  return points
}
