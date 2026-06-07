export type KnockoutDecidedIn = 'regulation' | 'extra_time' | 'penalties'

export interface KnockoutPredictionInput {
  predHome: number
  predAway: number
  homeTeamId: string
  awayTeamId: string
  advancesTeamId?: string | null
  decidedIn?: KnockoutDecidedIn | null
}

export function isKnockoutPredictionComplete(input: {
  predHome: number
  predAway: number
  advancesTeamId?: string | null
}): boolean {
  if (input.predHome !== input.predAway) return true
  return Boolean(input.advancesTeamId)
}

export function resolveKnockoutAdvancesTeamId(input: KnockoutPredictionInput): string | null {
  if (input.predHome > input.predAway) return input.homeTeamId
  if (input.predAway > input.predHome) return input.awayTeamId
  return input.advancesTeamId ?? null
}

export function resolveKnockoutDecidedIn(input: KnockoutPredictionInput): KnockoutDecidedIn | null {
  if (input.predHome !== input.predAway) return 'regulation'
  if (!input.advancesTeamId) return null
  return input.decidedIn ?? null
}

export function validateKnockoutPrediction(input: KnockoutPredictionInput): string | null {
  if (input.predHome === input.predAway) {
    if (!input.advancesTeamId) {
      return 'Con empate en 90 minutos indicá quién avanza.'
    }
    if (input.advancesTeamId !== input.homeTeamId && input.advancesTeamId !== input.awayTeamId) {
      return 'El equipo que avanza debe ser local o visitante.'
    }
    if (!input.decidedIn || input.decidedIn === 'regulation') {
      return 'Indicá si define en prórroga o penales.'
    }
  }
  return null
}

export function formatKnockoutPredictionNote(
  predHome: number,
  predAway: number,
  decidedIn: KnockoutDecidedIn | null | undefined,
  advancesSide: 'home' | 'away' | null
): string | null {
  if (predHome !== predAway || !decidedIn || !advancesSide) return null
  const phase = decidedIn === 'extra_time' ? 'prórroga' : 'penales'
  const side = advancesSide === 'home' ? 'local' : 'visitante'
  return `Empate ${predHome}-${predAway} · avanza ${side} (${phase})`
}
