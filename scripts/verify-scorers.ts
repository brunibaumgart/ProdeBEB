/**
 * Verifica reglas de puntos por goleadores (Fecha a Fecha).
 * Ejecutar: npx tsx scripts/verify-scorers.ts
 */
import {
  adjustScorersToCount,
  calculateScorerPoints,
  getScorerPointsForPosition,
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

const actual = new Set(['p1', 'p3'])
const predicted = ['p1', 'p2', 'p3']
assert(
  calculateScorerPoints(predicted, actual, positions) === 12,
  'portero + mediocampista acertados = 12'
)

// Goleadores independientes del resultado: solo importa si el jugador marcó
assert(
  calculateScorerPoints(['p4'], new Set(['p4']), positions) === 1,
  'acierta delantero aunque el marcador sea otro'
)

// Sin orden: predicho como gol 1, marcó de cualquier forma
assert(
  calculateScorerPoints(['p1', 'p2'], new Set(['p2', 'p1']), positions) === 15,
  'orden de goles no importa'
)
assert(
  calculateScorerPoints(['p1'], new Set(['p1']), positions) === 10,
  'jugador predicho en gol 1 suma aunque haya sido el segundo gol real'
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

console.log('OK: verify-scorers')
