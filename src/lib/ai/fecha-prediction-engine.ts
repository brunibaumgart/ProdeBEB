import fs from 'fs'
import path from 'path'

export interface ScorePrediction {
  predHome: number
  predAway: number
}

const fifaRankings = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data/fifa_rankings.json'), 'utf-8'),
) as { rankings: Record<string, number> }

const HOST_TEAMS = new Set(['USA', 'Mexico', 'Canada'])
const DEFAULT_RANK = 90

function getFifaRank(teamName: string): number {
  const rank = (fifaRankings.rankings as Record<string, number>)[teamName]
  return rank ?? DEFAULT_RANK
}

/** Predicción de marcador según ranking FIFA + ventaja local en sedes 2026. */
export function predictMatchScore(homeTeamName: string, awayTeamName: string): ScorePrediction {
  let homeRank = getFifaRank(homeTeamName)
  const awayRank = getFifaRank(awayTeamName)

  if (HOST_TEAMS.has(homeTeamName)) homeRank -= 6

  const gap = awayRank - homeRank

  if (gap >= 35) return { predHome: 3, predAway: 0 }
  if (gap >= 22) return { predHome: 2, predAway: 0 }
  if (gap >= 14) return { predHome: 2, predAway: 1 }
  if (gap >= 7) return { predHome: 1, predAway: 0 }
  if (gap >= -5) return { predHome: 1, predAway: 1 }
  if (gap >= -13) return { predHome: 0, predAway: 1 }
  if (gap >= -21) return { predHome: 0, predAway: 2 }
  return { predHome: 0, predAway: 2 }
}

export interface ScorerPoolPlayer {
  id: string
  teamId: string
  position: string
  internationalMatches: number
}

export function pickScorerIdsForGoals(
  teamId: string,
  goalCount: number,
  players: ScorerPoolPlayer[],
): string[] {
  if (goalCount <= 0) return []

  const teamPlayers = players
    .filter((player) => player.teamId === teamId)
    .sort((a, b) => b.internationalMatches - a.internationalMatches)

  const forwards = teamPlayers.filter((player) => player.position === 'Delantero')
  const midfielders = teamPlayers.filter((player) => player.position === 'Mediocampista')
  const pool = forwards.length > 0 ? [...forwards, ...midfielders] : teamPlayers

  if (pool.length === 0) return []

  const ids: string[] = []
  for (let index = 0; index < goalCount; index += 1) {
    ids.push(pool[index % pool.length]!.id)
  }

  return ids
}
