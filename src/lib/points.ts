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

    const predDiff = pred.predHome - pred.predAway
    const realDiff = result.homeScore - result.awayScore
    if (predDiff === realDiff) points += 1
  }

  return points
}

// ─── Prode Completo (sistema distinto — anticipación y bracket) ────────────

/** Posición exacta en grupo (1.º, 2.º, 3.º o 4.º) por equipo. */
export const COMPLETE_POINTS_EXACT_POSITION = 4

/** Ambos equipos del cruce de eliminatoria son los que predijiste. */
export const COMPLETE_POINTS_CORRECT_MATCHUP = 6

/** Base por acertar ganador en eliminatoria (se multiplica por ronda). */
export const COMPLETE_POINTS_KNOCKOUT_WINNER_BASE = 4

/** Campeón correcto (predicción antes del torneo). */
export const COMPLETE_POINTS_CHAMPION = 25

/** Bonus por confirmar el bracket antes del cierre global (15 % del subtotal). */
export const COMPLETE_EARLY_BONUS_RATE = 0.15

/** Multiplicador por ronda — a más avanzada la etapa, más vale acertar. */
export const COMPLETE_ROUND_MULTIPLIER: Record<string, number> = {
  'Round of 32': 1,
  'Round of 16': 1.5,
  Quarterfinals: 2,
  Semifinals: 2.5,
  '3rd Place': 1.5,
  Final: 4,
}

export function getCompleteRoundMultiplier(round: string): number {
  return COMPLETE_ROUND_MULTIPLIER[round] ?? 1
}

export function calculateEarlyBonusPoints(subtotal: number): number {
  if (subtotal <= 0) return 0
  return Math.floor(subtotal * COMPLETE_EARLY_BONUS_RATE)
}
