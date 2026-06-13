/**
 * Verifica reglas de puntos por goleadores (Fecha a Fecha).
 * Ejecutar: npx tsx scripts/verify-scorers.ts
 */
import {
  adjustScorersToCount,
  calculateScorerPoints,
  getScorerPointsForPosition,
  OWN_GOAL_POINTS,
  type ScorerGoalEntry,
  validateOptionalScorerCounts,
  validateScorerCounts,
} from '../src/lib/scoring/scorers'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error('FAIL:', message)
    process.exit(1)
  }
}

assert(getScorerPointsForPosition('Portero') === 10, 'portero +10')
assert(getScorerPointsForPosition('Defensa') === 5, 'defensa +5')
assert(getScorerPointsForPosition('Mediocampista') === 2, 'mediocampista +2')
assert(getScorerPointsForPosition('Delantero') === 1, 'delantero +1')

const positions = new Map([
  ['p1', 'Portero'],
  ['p2', 'Defensa'],
  ['p3', 'Mediocampista'],
  ['p4', 'Delantero'],
])

const actualPlayers: ScorerGoalEntry[] = [
  { playerId: 'p1', isOwnGoal: false, isHome: true },
  { playerId: 'p3', isOwnGoal: false, isHome: false },
]
const predictedPlayers: ScorerGoalEntry[] = [
  { playerId: 'p1', isOwnGoal: false, isHome: true },
  { playerId: 'p2', isOwnGoal: false, isHome: true },
  { playerId: 'p3', isOwnGoal: false, isHome: false },
]

assert(
  calculateScorerPoints(predictedPlayers, actualPlayers, positions) === 12,
  'portero + mediocampista acertados = 12'
)

assert(
  calculateScorerPoints(
    [{ playerId: 'p4', isOwnGoal: false, isHome: true }],
    [{ playerId: 'p4', isOwnGoal: false, isHome: true }],
    positions
  ) === 1,
  'acierta delantero aunque el marcador sea otro'
)

assert(
  calculateScorerPoints(
    [
      { playerId: 'p1', isOwnGoal: false, isHome: true },
      { playerId: 'p2', isOwnGoal: false, isHome: true },
    ],
    [
      { playerId: 'p2', isOwnGoal: false, isHome: true },
      { playerId: 'p1', isOwnGoal: false, isHome: true },
    ],
    positions
  ) === 15,
  'orden de goles no importa'
)

assert(
  calculateScorerPoints(
    [{ playerId: null, isOwnGoal: true, isHome: true }],
    [{ playerId: null, isOwnGoal: true, isHome: true }],
    positions
  ) === OWN_GOAL_POINTS,
  'autogol acertado suma +5'
)

assert(
  calculateScorerPoints(
    [
      { playerId: null, isOwnGoal: true, isHome: true },
      { playerId: null, isOwnGoal: true, isHome: true },
    ],
    [{ playerId: null, isOwnGoal: true, isHome: true }],
    positions
  ) === OWN_GOAL_POINTS,
  'solo cuenta autogoles reales aunque predigas de más'
)

assert(
  adjustScorersToCount(['a', 'b', 'c'], 2).join(',') === 'a,b',
  'recorta goleadores sobrantes al final'
)
assert(
  adjustScorersToCount(['a', 'b'], 4).join(',') === 'a,b',
  'conserva goleadores al ampliar resultado'
)

assert(validateScorerCounts(2, 1, ['a', 'b'], ['c']) === null, 'conteos admin válidos')
assert(
  validateScorerCounts(2, 1, ['a'], ['c']) != null,
  'conteos admin inválidos local'
)
assert(validateOptionalScorerCounts(2, 1, [], []) === null, 'goleadores opcionales vacíos')
assert(
  validateOptionalScorerCounts(2, 1, ['a', 'b'], ['c']) === null,
  'goleadores opcionales completos'
)
assert(
  validateOptionalScorerCounts(2, 1, ['__own_goal__', 'a'], []) === null,
  'autogol cuenta como goleador opcional válido'
)

console.log('OK: verify-scorers')
