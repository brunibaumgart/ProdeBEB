export type KnockoutDecidedIn = 'regulation' | 'extra_time' | 'penalties'

export interface KnockoutPredictionInput {
  predHome: number
  predAway: number
  homeTeamId: string
  awayTeamId: string
  advancesTeamId?: string | null
  decidedIn?: KnockoutDecidedIn | null
}

/** Knockout picks are winner-only: complete when the advancing team is known. */
export function isKnockoutPredictionComplete(input: {
  predHome: number
  predAway: number
  advancesTeamId?: string | null
}): boolean {
  if (input.advancesTeamId) return true
  return input.predHome !== input.predAway
}

export function resolveKnockoutAdvancesTeamId(input: KnockoutPredictionInput): string | null {
  if (input.advancesTeamId) return input.advancesTeamId
  if (input.predHome > input.predAway) return input.homeTeamId
  if (input.predAway > input.predHome) return input.awayTeamId
  return null
}

export function resolveKnockoutDecidedIn(input: KnockoutPredictionInput): KnockoutDecidedIn | null {
  if (!resolveKnockoutAdvancesTeamId(input)) return null
  return 'regulation'
}

export function validateKnockoutPrediction(input: KnockoutPredictionInput): string | null {
  const advancesTeamId = resolveKnockoutAdvancesTeamId(input)
  if (!advancesTeamId) {
    return 'Elegí qué selección avanza.'
  }
  if (advancesTeamId !== input.homeTeamId && advancesTeamId !== input.awayTeamId) {
    return 'El equipo que avanza debe ser local o visitante.'
  }
  return null
}

export function formatKnockoutPredictionNote(
  advancesTeamName: string,
): string {
  return `Avanza ${advancesTeamName}`
}
