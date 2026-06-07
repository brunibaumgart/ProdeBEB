/**
 * Verifica reglas de puntos del Prode Completo (v2).
 * Ejecutar: npx tsx scripts/verify-complete-scoring.ts
 */
import {
  COMPLETE_POINTS_CHAMPION,
  COMPLETE_POINTS_CORRECT_MATCHUP,
  COMPLETE_POINTS_EXACT_POSITION,
  COMPLETE_POINTS_KNOCKOUT_WINNER_BASE,
  calculateEarlyBonusPoints,
  calculateMatchdayPoints,
  getCompleteRoundMultiplier,
} from '../src/lib/points'
import { calculateBracketSlotPoints } from '../src/lib/scoring/complete/match'
import { calculateChampionPoints } from '../src/lib/scoring/complete/champion'
import { countPositionPoints } from '../src/lib/scoring/complete/positions'
import type { Standing } from '../src/lib/bracket'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error('FAIL:', message)
    process.exit(1)
  }
}

assert(calculateMatchdayPoints({ predHome: 2, predAway: 1 }, { homeScore: 2, awayScore: 1 }) === 3, 'fecha exacto')

const standing = (team: string, pts: number): Standing => ({
  teamName: team,
  played: 3,
  won: 1,
  drawn: 1,
  lost: 1,
  goalsFor: 3,
  goalsAgainst: 3,
  goalDiff: 0,
  points: pts,
})

const predicted = new Map<string, Standing[]>([
  ['A', [standing('Mexico', 7), standing('France', 4), standing('Poland', 2), standing('X', 1)]],
])
const actual = new Map<string, Standing[]>([
  ['A', [standing('Mexico', 7), standing('France', 4), standing('X', 2), standing('Poland', 1)]],
])
assert(
  countPositionPoints(predicted, actual) === 2 * COMPLETE_POINTS_EXACT_POSITION,
  'posiciones exactas'
)

const knockoutPoints = calculateBracketSlotPoints(
  {
    predHomeScore: 2,
    predAwayScore: 1,
    predHomeTeamId: 'home-id',
    predAwayTeamId: 'away-id',
    predAdvancesTeamId: null,
  },
  {
    round: 'Final',
    homeScore: 2,
    awayScore: 1,
    homeTeamId: 'home-id',
    awayTeamId: 'away-id',
    homeTeamName: 'Spain',
    awayTeamName: 'France',
  }
)
const expectedFinal =
  COMPLETE_POINTS_CORRECT_MATCHUP +
  Math.round(COMPLETE_POINTS_KNOCKOUT_WINNER_BASE * getCompleteRoundMultiplier('Final'))
assert(knockoutPoints === expectedFinal, 'cruce + ganador final')

const wrongMatchup = calculateBracketSlotPoints(
  {
    predHomeScore: 2,
    predAwayScore: 1,
    predHomeTeamId: 'wrong',
    predAwayTeamId: 'wrong',
  },
  {
    round: 'Final',
    homeScore: 2,
    awayScore: 1,
    homeTeamId: 'home-id',
    awayTeamId: 'away-id',
    homeTeamName: 'Spain',
    awayTeamName: 'France',
  }
)
assert(wrongMatchup === 0, 'cruce incorrecto')

assert(calculateChampionPoints('a', 'a') === COMPLETE_POINTS_CHAMPION, 'campeón')
assert(calculateEarlyBonusPoints(100) === 15, 'bonus temprano 15%')

console.log('OK: reglas Prode Completo v2 verificadas.')
