import { getCompleteKnockoutRoundScoring } from './rules'

export interface BracketSlotScoreInput {
  predHomeScore: number | null
  predAwayScore: number | null
  predHomeTeamId: string | null
  predAwayTeamId: string | null
  predAdvancesTeamId?: string | null
}

export interface FinishedMatchScoreInput {
  round: string
  homeScore: number | null
  awayScore: number | null
  homeTeamId: string | null
  awayTeamId: string | null
  homeTeamName: string | null
  awayTeamName: string | null
}

function isMatchupCorrect(
  slot: BracketSlotScoreInput,
  match: FinishedMatchScoreInput,
): boolean {
  if (!match.homeTeamId || !match.awayTeamId) return false
  if (!slot.predHomeTeamId || !slot.predAwayTeamId) return false
  return (
    slot.predHomeTeamId === match.homeTeamId &&
    slot.predAwayTeamId === match.awayTeamId
  )
}

function predictedWinnerTeamId(
  slot: BracketSlotScoreInput,
  match: FinishedMatchScoreInput,
): string | null {
  if (slot.predAdvancesTeamId) return slot.predAdvancesTeamId
  if (slot.predHomeScore == null || slot.predAwayScore == null) return null
  if (slot.predHomeScore > slot.predAwayScore) return match.homeTeamId
  if (slot.predAwayScore > slot.predHomeScore) return match.awayTeamId
  return null
}

function actualWinnerTeamId(match: FinishedMatchScoreInput): string | null {
  if (match.homeScore == null || match.awayScore == null) return null
  if (match.homeScore > match.awayScore) return match.homeTeamId
  if (match.awayScore > match.homeScore) return match.awayTeamId
  return null
}

export function buildPredictedTeamIdsInRound(
  slots: Array<{
    predHomeTeamId: string | null
    predAwayTeamId: string | null
    match: { round: string }
  }>,
  round: string,
): Set<string> {
  const ids = new Set<string>()

  for (const slot of slots) {
    if (slot.match.round !== round) continue
    if (slot.predHomeTeamId) ids.add(slot.predHomeTeamId)
    if (slot.predAwayTeamId) ids.add(slot.predAwayTeamId)
  }

  return ids
}

export function calculateBracketSlotPoints(
  slot: BracketSlotScoreInput,
  match: FinishedMatchScoreInput,
  predictedTeamsInRound: Set<string>,
): number | null {
  if (match.homeScore == null || match.awayScore == null) return null
  if (match.round === 'Group Stage') return null

  const roundScoring = getCompleteKnockoutRoundScoring(match.round)
  if (!roundScoring) return null

  if (slot.predHomeScore == null || slot.predAwayScore == null) return null
  if (!match.homeTeamName || !match.awayTeamName) return null

  let points = 0

  if (roundScoring.perTeam > 0) {
    if (match.homeTeamId && predictedTeamsInRound.has(match.homeTeamId)) {
      points += roundScoring.perTeam
    }
    if (match.awayTeamId && predictedTeamsInRound.has(match.awayTeamId)) {
      points += roundScoring.perTeam
    }
  }

  if (roundScoring.exactMatchup > 0 && isMatchupCorrect(slot, match)) {
    points += roundScoring.exactMatchup
  }

  if (roundScoring.winnerBonus) {
    const predictedWinner = predictedWinnerTeamId(slot, match)
    const realWinner = actualWinnerTeamId(match)
    if (predictedWinner && realWinner && predictedWinner === realWinner) {
      points += roundScoring.winnerBonus
    }
  }

  return points
}
