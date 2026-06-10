/**
 * Verifica predicciones knockout (solo ganador).
 * npx tsx scripts/verify-knockout-prediction.ts
 */
import {
  isKnockoutPredictionComplete,
  validateKnockoutPrediction,
  resolveKnockoutAdvancesTeamId,
} from '../src/lib/bracket/knockout-prediction'
import {
  encodeKnockoutWinner,
  matchdayScoresToGroupOutcome,
  outcomeToScores,
  scoresToGroupOutcome,
} from '../src/lib/bracket/match-outcome'

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
}

assert(
  isKnockoutPredictionComplete({ predHome: 1, predAway: 0, advancesTeamId: 'home' }),
  'winner pick complete',
)
assert(
  isKnockoutPredictionComplete({ predHome: 1, predAway: 0, advancesTeamId: null }),
  'regulation win from scores',
)
assert(
  !isKnockoutPredictionComplete({ predHome: 0, predAway: 0, advancesTeamId: null }),
  'draw without pick incomplete',
)

assert(
  validateKnockoutPrediction({
    predHome: 1,
    predAway: 0,
    homeTeamId: 'home',
    awayTeamId: 'away',
    advancesTeamId: 'home',
  }) === null,
  'valid home winner',
)

assert(
  resolveKnockoutAdvancesTeamId({
    predHome: 0,
    predAway: 1,
    homeTeamId: 'home',
    awayTeamId: 'away',
    advancesTeamId: 'away',
  }) === 'away',
  'advances away',
)

assert(scoresToGroupOutcome(1, 0) === 'home_win', 'home win outcome')
assert(scoresToGroupOutcome(0, 0) === 'draw', 'draw outcome')
assert(scoresToGroupOutcome(0, 1) === 'away_win', 'away win outcome')
assert(
  matchdayScoresToGroupOutcome(3, 1) === 'home_win',
  'matchday exact score maps to home win',
)
assert(
  outcomeToScores('draw').predHome === 0 && outcomeToScores('draw').predAway === 0,
  'draw canonical score',
)
assert(
  encodeKnockoutWinner('home', 'home').predHome === 1,
  'encode home winner',
)

console.log('OK: knockout winner-only + group outcomes')
