import type { Standing } from '@/lib/bracket'
import { resolvePredictedBracket } from '@/lib/bracket/predicted-bracket'
import type { CelebrityBracket } from '@/lib/bracket/celebrity-predictions/types'

import { calculateChampionPoints } from './champion'
import {
  buildPredictedTeamIdsInRound,
  calculateBracketSlotPoints,
  type FinishedMatchScoreInput,
} from './match'
import { countPositionPoints } from './positions'

const FINAL_MATCH_ID = 104

export type CelebrityFinishedMatch = FinishedMatchScoreInput & {
  id: number
}

export type CelebrityPointsBreakdown = {
  knockout: number
  positions: number
  champion: number
  total: number
}

export function computeCelebrityCompletePoints(
  celebrity: CelebrityBracket,
  finishedMatches: CelebrityFinishedMatch[],
  actualGroupStandings: Map<string, Standing[]> | null,
  teams: { id: string; name: string; nameEs: string; iso2: string; flagEmoji: string }[],
  knockoutMatches: { id: number; homeLabel: string | null; awayLabel: string | null }[],
): CelebrityPointsBreakdown | null {
  if (finishedMatches.length === 0 && !actualGroupStandings) return null

  const teamByName = new Map(teams.map((team) => [team.name, team]))
  const resolvedKnockout = resolvePredictedBracket(
    celebrity.groupStandings,
    knockoutMatches,
    celebrity.predictions,
    celebrity.predictions,
    teamByName,
    celebrity.tiebreakOrder,
  )

  const knockoutSlots = knockoutMatches
    .map((match) => {
      const prediction = celebrity.predictions[match.id]
      const resolved = resolvedKnockout.get(match.id)
      if (!prediction || !resolved?.homeTeamId || !resolved.awayTeamId) return null
      return {
        matchId: match.id,
        prediction,
        predHomeTeamId: resolved.homeTeamId,
        predAwayTeamId: resolved.awayTeamId,
      }
    })
    .filter((entry) => entry != null)

  const matchById = new Map(finishedMatches.map((match) => [match.id, match]))
  let knockoutPoints = 0

  for (const slot of knockoutSlots) {
    const finished = matchById.get(slot.matchId)
    if (!finished) continue

    const predictedTeamsInRound = buildPredictedTeamIdsInRound(
      knockoutSlots.map((entry) => {
        const match = matchById.get(entry.matchId)
        return {
          predHomeTeamId: entry.predHomeTeamId,
          predAwayTeamId: entry.predAwayTeamId,
          match: { round: match?.round ?? finished.round },
        }
      }),
      finished.round,
    )

    const points = calculateBracketSlotPoints(
      {
        predHomeScore: slot.prediction.predHome,
        predAwayScore: slot.prediction.predAway,
        predHomeTeamId: slot.predHomeTeamId,
        predAwayTeamId: slot.predAwayTeamId,
        predAdvancesTeamId: slot.prediction.predAdvancesTeamId,
      },
      finished,
      predictedTeamsInRound,
    )

    if (points != null) knockoutPoints += points
  }

  const positionsPoints =
    actualGroupStandings != null
      ? countPositionPoints(celebrity.groupStandings, actualGroupStandings)
      : 0

  const finalMatch = matchById.get(FINAL_MATCH_ID)
  let winnerTeamId: string | null = null
  if (
    finalMatch?.homeTeamId &&
    finalMatch.awayTeamId &&
    finalMatch.homeScore != null &&
    finalMatch.awayScore != null
  ) {
    winnerTeamId =
      finalMatch.homeScore > finalMatch.awayScore
        ? finalMatch.homeTeamId
        : finalMatch.awayScore > finalMatch.homeScore
          ? finalMatch.awayTeamId
          : null
  }

  const championPoints = calculateChampionPoints(celebrity.championTeamId, winnerTeamId)

  return {
    knockout: knockoutPoints,
    positions: positionsPoints,
    champion: championPoints,
    total: knockoutPoints + positionsPoints + championPoints,
  }
}
