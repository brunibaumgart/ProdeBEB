export interface MatchResult {
  homeScore: number
  awayScore: number
}

export interface Prediction {
  predHome: number
  predAway: number
}

function getOutcome(home: number, away: number): 'home' | 'away' | 'draw' {
  if (home > away) return 'home'
  if (away > home) return 'away'
  return 'draw'
}

// ─── Prode Fecha a Fecha ───────────────────────────────────────────────────

export function calculateMatchdayPoints(pred: Prediction, result: MatchResult): number {
  let points = 0

  const predOutcome = getOutcome(pred.predHome, pred.predAway)
  const realOutcome = getOutcome(result.homeScore, result.awayScore)

  if (pred.predHome === result.homeScore && pred.predAway === result.awayScore) {
    return 3
  }

  if (predOutcome === realOutcome) {
    points += 1

    // En empates la diferencia siempre es 0: el bonus de DG no aplica (solo 1 pt sin exacto).
    if (predOutcome !== 'draw') {
      const predDiff = pred.predHome - pred.predAway
      const realDiff = result.homeScore - result.awayScore
      if (predDiff === realDiff) points += 1
    }
  }

  return points
}

// ─── Prode Completo (sistema anticipado — ver src/lib/scoring/complete/rules.ts) ─

export {
  COMPLETE_POINTS_CHAMPION,
  COMPLETE_POINTS_EXACT_GROUP_POSITION,
  COMPLETE_POINTS_R32_QUALIFIER,
  COMPLETE_POINTS_THIRD_PLACE_WINNER,
  COMPLETE_KNOCKOUT_ROUND_SCORING,
} from '@/lib/scoring/complete/rules'

/** @deprecated Ya no hay bonus temprano. */
export const COMPLETE_EARLY_BONUS_RATE = 0

/** @deprecated Usar COMPLETE_KNOCKOUT_ROUND_SCORING. */
export const COMPLETE_POINTS_CORRECT_MATCHUP = 0

/** @deprecated Usar COMPLETE_KNOCKOUT_ROUND_SCORING. */
export const COMPLETE_POINTS_KNOCKOUT_WINNER_BASE = 0

/** @deprecated Usar COMPLETE_POINTS_EXACT_GROUP_POSITION y COMPLETE_POINTS_R32_QUALIFIER. */
export const COMPLETE_POINTS_EXACT_POSITION = 2

/** @deprecated Ya no hay multiplicadores por ronda. */
export const COMPLETE_ROUND_MULTIPLIER: Record<string, number> = {}

export function getCompleteRoundMultiplier(_round: string): number {
  return 1
}

/** @deprecated Ya no hay bonus temprano. */
export function calculateEarlyBonusPoints(_subtotal: number): number {
  return 0
}
