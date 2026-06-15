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
import type { SimulatorGroupMatchRef } from '../src/lib/bracket/simulator'

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

console.log('OK: mejores terceros solo tras fecha 2 y comparación con resultados reales')
