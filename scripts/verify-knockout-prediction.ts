/**
 * Verifica predicciones knockout con prórroga/penales.
 * npx tsx scripts/verify-knockout-prediction.ts
 */
import {
  isKnockoutPredictionComplete,
  validateKnockoutPrediction,
  resolveKnockoutAdvancesTeamId,
} from '../src/lib/bracket/knockout-prediction'

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
}

assert(
  isKnockoutPredictionComplete({ predHome: 2, predAway: 1, advancesTeamId: null }),
  'regulation win'
)
assert(
  !isKnockoutPredictionComplete({ predHome: 1, predAway: 1, advancesTeamId: null }),
  'draw incomplete'
)
assert(
  isKnockoutPredictionComplete({ predHome: 1, predAway: 1, advancesTeamId: 'home' }),
  'draw with advances'
)

assert(
  validateKnockoutPrediction({
    predHome: 1,
    predAway: 1,
    homeTeamId: 'home',
    awayTeamId: 'away',
    advancesTeamId: 'home',
    decidedIn: 'penalties',
  }) === null,
  'valid penales'
)

assert(
  resolveKnockoutAdvancesTeamId({
    predHome: 1,
    predAway: 1,
    homeTeamId: 'home',
    awayTeamId: 'away',
    advancesTeamId: 'away',
  }) === 'away',
  'advances away on draw'
)

console.log('OK: knockout prórroga/penales')
