/**
 * Verifica reglas de puntos del Prode Completo (v3).
 * Ejecutar: npx tsx scripts/verify-complete-scoring.ts
 */
import { calculateMatchdayPoints } from '../src/lib/points'
import { calculateBracketSlotPoints, buildPredictedTeamIdsInRound } from '../src/lib/scoring/complete/match'
import { calculateChampionPoints } from '../src/lib/scoring/complete/champion'
import {
  countPositionPoints,
  getRoundOf32TeamNames,
} from '../src/lib/scoring/complete/positions'
import {
  COMPLETE_POINTS_CHAMPION,
  COMPLETE_POINTS_EXACT_GROUP_POSITION,
  COMPLETE_POINTS_R32_QUALIFIER,
  COMPLETE_POINTS_THIRD_PLACE_WINNER,
} from '../src/lib/scoring/complete/rules'
import type { Standing } from '../src/lib/bracket'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error('FAIL:', message)
    process.exit(1)
  }
}

assert(calculateMatchdayPoints({ predHome: 2, predAway: 1 }, { homeScore: 2, awayScore: 1 }) === 3, 'fecha exacto')
assert(calculateMatchdayPoints({ predHome: 0, predAway: 0 }, { homeScore: 1, awayScore: 1 }) === 1, 'fecha empate sin bonus DG')

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
  ['B', [standing('Brazil', 7), standing('Spain', 4), standing('Chile', 2), standing('Y', 1)]],
])
const actual = new Map<string, Standing[]>([
  ['A', [standing('Mexico', 7), standing('France', 4), standing('X', 2), standing('Poland', 1)]],
  ['B', [standing('Brazil', 7), standing('Spain', 4), standing('Chile', 2), standing('Y', 1)]],
])

const actualR32 = getRoundOf32TeamNames(actual)
assert(actualR32.has('Mexico') && actualR32.size >= 4, 'R32 desde standings')

const positionPoints = countPositionPoints(predicted, actual)
assert(
  positionPoints >= COMPLETE_POINTS_R32_QUALIFIER * 3 + COMPLETE_POINTS_EXACT_GROUP_POSITION,
  'grupos: clasificados + posición exacta',
)

const octavosTeams = new Set(['home-id', 'away-id'])
const octavosPoints = calculateBracketSlotPoints(
  {
    predHomeScore: 1,
    predAwayScore: 0,
    predHomeTeamId: 'home-id',
    predAwayTeamId: 'away-id',
    predAdvancesTeamId: 'home-id',
  },
  {
    round: 'Round of 16',
    homeScore: 2,
    awayScore: 1,
    homeTeamId: 'home-id',
    awayTeamId: 'away-id',
    homeTeamName: 'Spain',
    awayTeamName: 'France',
  },
  octavosTeams,
)
assert(octavosPoints === 5 + 5 + 10, 'octavos: 2 equipos + cruce exacto')

const r32Points = calculateBracketSlotPoints(
  {
    predHomeScore: 1,
    predAwayScore: 0,
    predHomeTeamId: 'home-id',
    predAwayTeamId: 'away-id',
  },
  {
    round: 'Round of 32',
    homeScore: 1,
    awayScore: 0,
    homeTeamId: 'home-id',
    awayTeamId: 'away-id',
    homeTeamName: 'Spain',
    awayTeamName: 'France',
  },
  new Set(),
)
assert(r32Points === 5, '16avos: solo cruce exacto')

const thirdPlacePoints = calculateBracketSlotPoints(
  {
    predHomeScore: 0,
    predAwayScore: 0,
    predHomeTeamId: 'home-id',
    predAwayTeamId: 'away-id',
    predAdvancesTeamId: 'home-id',
  },
  {
    round: '3rd Place',
    homeScore: 1,
    awayScore: 0,
    homeTeamId: 'home-id',
    awayTeamId: 'away-id',
    homeTeamName: 'Spain',
    awayTeamName: 'France',
  },
  new Set(['home-id', 'away-id']),
)
assert(
  thirdPlacePoints === 20 + 20 + COMPLETE_POINTS_THIRD_PLACE_WINNER,
  'tercer puesto: equipos + ganador',
)

assert(calculateChampionPoints('a', 'a') === COMPLETE_POINTS_CHAMPION, 'campeón 50')

const predictedTeams = buildPredictedTeamIdsInRound(
  [
    {
      predHomeTeamId: 'a',
      predAwayTeamId: 'b',
      match: { round: 'Semifinals' },
    },
  ],
  'Semifinals',
)
assert(predictedTeams.has('a') && predictedTeams.has('b'), 'equipos predichos en ronda')

console.log('OK: reglas Prode Completo v3 verificadas.')
