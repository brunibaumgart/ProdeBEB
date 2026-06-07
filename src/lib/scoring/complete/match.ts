import {
  COMPLETE_POINTS_CORRECT_MATCHUP,
  COMPLETE_POINTS_KNOCKOUT_WINNER_BASE,
  getCompleteRoundMultiplier,
} from '@/lib/points'

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
  match: FinishedMatchScoreInput
): boolean {
  if (!match.homeTeamId || !match.awayTeamId) return false
  if (!slot.predHomeTeamId || !slot.predAwayTeamId) return false
  return (
    slot.predHomeTeamId === match.homeTeamId &&
    slot.predAwayTeamId === match.awayTeamId
  )
}

export function calculateBracketSlotPoints(
  slot: BracketSlotScoreInput,
  match: FinishedMatchScoreInput
): number | null {
  if (match.homeScore == null || match.awayScore == null) return null

  if (match.round === 'Group Stage') return null

  if (slot.predHomeScore == null || slot.predAwayScore == null) return null
  if (!match.homeTeamName || !match.awayTeamName) return null

  if (!isMatchupCorrect(slot, match)) return 0

  let points = COMPLETE_POINTS_CORRECT_MATCHUP

  const predictedWinnerTeamId =
    slot.predHomeScore > slot.predAwayScore
      ? match.homeTeamId
      : slot.predAwayScore > slot.predHomeScore
        ? match.awayTeamId
        : slot.predAdvancesTeamId

  if (!predictedWinnerTeamId) return points

  const realWinnerTeamId =
    match.homeScore > match.awayScore
      ? match.homeTeamId
      : match.awayScore > match.homeScore
        ? match.awayTeamId
        : null

  if (realWinnerTeamId && predictedWinnerTeamId === realWinnerTeamId) {
    const multiplier = getCompleteRoundMultiplier(match.round)
    points += Math.round(COMPLETE_POINTS_KNOCKOUT_WINNER_BASE * multiplier)
  }

  return points
}
