/**
 * Verifica reglas del buscador de escenarios (mejores terceros).
 * npx tsx scripts/verify-classification-scenarios.ts
 */
import {
  BEST_THIRD_MIN_MATCHDAY,
  canUseBestThirdScenario,
  findClassificationScenarios,
  isGroupStageMatchdayComplete,
} from '../src/lib/bracket/classification-scenarios'
import {
  buildScenarioProjectedOverrides,
  buildScenarioResultMatrix,
  resolveScenarioDisplayPredictions,
} from '../src/lib/bracket/scenario-result-matrix'
import type { SimulatorGroupMatchRef } from '../src/lib/bracket/simulator'
import { findNextGroupMatchIndex, resolveGroupStandingsHybrid } from '../src/lib/bracket/simulator'

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
}

function matchRef(
  id: number,
  group: string,
  matchday: number,
  status: 'finished' | 'scheduled' = 'scheduled',
  homeScore: number | null = null,
  awayScore: number | null = null,
): SimulatorGroupMatchRef {
  return {
    id,
    group,
    matchday,
    status,
    homeScore,
    awayScore,
    homeName: `${group}-H${id}`,
    awayName: `${group}-A${id}`,
  }
}

function buildMiniTournament(matchday2Finished: boolean) {
  const matches: SimulatorGroupMatchRef[] = []

  for (const group of ['A', 'B']) {
    for (const matchday of [1, 2, 3]) {
      const finished =
        matchday <= 2
          ? matchday2Finished
          : false

      matches.push(
        matchRef(
          Number(`${group.charCodeAt(0)}${matchday}`),
          group,
          matchday,
          finished ? 'finished' : 'scheduled',
          finished ? 1 : null,
          finished ? 0 : null,
        ),
      )
    }
  }

  return matches
}

const beforeFecha2 = buildMiniTournament(false)
const afterFecha2 = buildMiniTournament(true)

assert(BEST_THIRD_MIN_MATCHDAY === 2, 'fecha mínima para mejores terceros')
assert(!isGroupStageMatchdayComplete(beforeFecha2, 2), 'fecha 2 incompleta detectada')
assert(isGroupStageMatchdayComplete(afterFecha2, 2), 'fecha 2 completa detectada')
assert(!canUseBestThirdScenario(beforeFecha2), 'best third bloqueado antes de fecha 2')
assert(canUseBestThirdScenario(afterFecha2), 'best third habilitado tras fecha 2')

const blocked = findClassificationScenarios({
  teams: [
    { name: 'A-H65', nameEs: 'A-H65', group: 'A', iso2: 'AR', flagEmoji: '🇦🇷' },
    { name: 'A-A65', nameEs: 'A-A65', group: 'A', iso2: 'BR', flagEmoji: '🇧🇷' },
    { name: 'B-H66', nameEs: 'B-H66', group: 'B', iso2: 'US', flagEmoji: '🇺🇸' },
    { name: 'B-A66', nameEs: 'B-A66', group: 'B', iso2: 'MX', flagEmoji: '🇲🇽' },
  ],
  allGroupMatches: beforeFecha2,
  group: 'A',
  constraints: [{ teamName: 'A-H65', position: 'best_third' }],
  matchLabels: new Map(),
})

assert(!blocked.ok, 'busca best third antes de fecha 2 falla')
if (!blocked.ok) {
  assert(
    blocked.error.includes('fecha 2'),
    'mensaje de bloqueo menciona fecha 2',
  )
}

const sampleMatches = [
  { id: 1, status: 'finished' as const, homeScore: 1, awayScore: 0, date: '2026-06-11' },
  { id: 2, status: 'scheduled' as const, homeScore: null, awayScore: null, date: '2026-06-17' },
  { id: 3, status: 'scheduled' as const, homeScore: null, awayScore: null, date: '2026-06-23' },
]

assert(findNextGroupMatchIndex(sampleMatches) === 1, 'default al próximo partido pendiente')

const allFinished = sampleMatches.map((m) => ({
  ...m,
  status: 'finished' as const,
  homeScore: 1,
  awayScore: 0,
}))
assert(findNextGroupMatchIndex(allFinished) === 2, 'si todos terminaron, muestra el último')

const matrixTeams = [
  { name: 'ARG', nameEs: 'Argentina', iso2: 'ar', flagEmoji: '🇦🇷' },
  { name: 'BRA', nameEs: 'Brasil', iso2: 'br', flagEmoji: '🇧🇷' },
  { name: 'CHI', nameEs: 'Chile', iso2: 'cl', flagEmoji: '🇨🇱' },
  { name: 'URU', nameEs: 'Uruguay', iso2: 'uy', flagEmoji: '🇺🇾' },
]

const matrixMatches: SimulatorGroupMatchRef[] = [
  { id: 101, group: 'A', status: 'finished', homeScore: 2, awayScore: 1, homeName: 'ARG', awayName: 'BRA' },
  { id: 102, group: 'A', status: 'scheduled', homeScore: null, awayScore: null, homeName: 'CHI', awayName: 'URU' },
  { id: 103, group: 'A', status: 'scheduled', homeScore: null, awayScore: null, homeName: 'ARG', awayName: 'CHI' },
  { id: 104, group: 'A', status: 'scheduled', homeScore: null, awayScore: null, homeName: 'BRA', awayName: 'URU' },
  { id: 105, group: 'A', status: 'scheduled', homeScore: null, awayScore: null, homeName: 'ARG', awayName: 'URU' },
  { id: 106, group: 'A', status: 'scheduled', homeScore: null, awayScore: null, homeName: 'BRA', awayName: 'CHI' },
]

const matrixPredictions = resolveScenarioDisplayPredictions(matrixMatches, [
  { matchId: 102, outcome: 'home_win', predHome: 1, predAway: 0 },
  { matchId: 103, outcome: 'draw', predHome: 0, predAway: 0 },
  { matchId: 104, outcome: 'away_win', predHome: 0, predAway: 1 },
  { matchId: 105, outcome: 'home_win', predHome: 2, predAway: 0 },
  { matchId: 106, outcome: 'draw', predHome: 1, predAway: 1 },
])

const matrix = buildScenarioResultMatrix(matrixTeams, matrixMatches, matrixPredictions)

assert(matrix[0][0] === 'self', 'diagonal mismo equipo')
assert(matrix[0][1] === 'win', 'ARG le ganó a BRA (partido terminado)')
assert(matrix[1][0] === 'loss', 'BRA perdió contra ARG')
assert(matrix[2][3] === 'win', 'CHI le gana a URU en escenario')
assert(matrix[3][2] === 'loss', 'URU pierde contra CHI')
assert(matrix[0][2] === 'draw', 'ARG empata con CHI')

const projectedOverrides = buildScenarioProjectedOverrides(matrixMatches, [
  { matchId: 102, outcome: 'home_win', predHome: 1, predAway: 0 },
  { matchId: 103, outcome: 'draw', predHome: 0, predAway: 0 },
  { matchId: 104, outcome: 'away_win', predHome: 0, predAway: 1 },
  { matchId: 105, outcome: 'home_win', predHome: 2, predAway: 0 },
  { matchId: 106, outcome: 'draw', predHome: 1, predAway: 1 },
])

const projectedStandings = resolveGroupStandingsHybrid(
  matrixTeams,
  matrixMatches,
  projectedOverrides,
  'A',
)

assert(projectedStandings[0]?.teamName === 'ARG', 'ARG lidera la tabla proyectada del escenario')

console.log('OK: escenarios de clasificación, tarjetas de escenario y navegación de partidos del simulador')
