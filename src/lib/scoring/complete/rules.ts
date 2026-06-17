/** Puntos por acertar que un equipo esté entre los 32 de dieciseisavos. */
export const COMPLETE_POINTS_R32_QUALIFIER = 1

/** Puntos extra por posición exacta en la tabla del grupo (1.º–4.º). */
export const COMPLETE_POINTS_EXACT_GROUP_POSITION = 2

export const COMPLETE_POINTS_CHAMPION = 50

export const COMPLETE_POINTS_THIRD_PLACE_WINNER = 30

export type CompleteKnockoutRoundScoring = {
  perTeam: number
  exactMatchup: number
  /** Suma si acertás quién gana el partido (3.er puesto). */
  winnerBonus?: number
}

export const COMPLETE_KNOCKOUT_ROUND_SCORING: Record<string, CompleteKnockoutRoundScoring> = {
  'Round of 32': { perTeam: 0, exactMatchup: 5 },
  'Round of 16': { perTeam: 5, exactMatchup: 10 },
  Quarterfinals: { perTeam: 10, exactMatchup: 15 },
  Semifinals: { perTeam: 15, exactMatchup: 25 },
  Final: { perTeam: 25, exactMatchup: 0 },
  '3rd Place': { perTeam: 20, exactMatchup: 0, winnerBonus: COMPLETE_POINTS_THIRD_PLACE_WINNER },
}

export function getCompleteKnockoutRoundScoring(round: string): CompleteKnockoutRoundScoring | null {
  return COMPLETE_KNOCKOUT_ROUND_SCORING[round] ?? null
}
