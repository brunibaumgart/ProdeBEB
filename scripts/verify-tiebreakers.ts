/**
 * Verificación manual de criterios FIFA 2026.
 * Ejecutar: npx tsx scripts/verify-tiebreakers.ts
 */
import type { Standing } from '../src/lib/bracket'
import { buildTiebreakMeta } from '../src/lib/bracket/fifa-rankings'
import { sortGroupStandingsByFifa } from '../src/lib/bracket/tiebreakers'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error('FAIL:', message)
    process.exit(1)
  }
}

function standing(name: string, pts: number, gd: number, gf: number): Standing {
  return {
    teamName: name,
    played: 3,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: gf,
    goalsAgainst: gf - gd,
    goalDiff: gd,
    points: pts,
  }
}

// Escenario 1: A y B empatados en puntos; A ganó el enfrentamiento directo
{
  const standings = [
    standing('TeamA', 6, 2, 5),
    standing('TeamB', 6, 1, 4),
    standing('TeamC', 3, 0, 2),
    standing('TeamD', 3, -3, 1),
  ]
  const matches = [
    { homeName: 'TeamA', awayName: 'TeamB', homeScore: 2, awayScore: 1 },
    { homeName: 'TeamA', awayName: 'TeamC', homeScore: 1, awayScore: 1 },
    { homeName: 'TeamA', awayName: 'TeamD', homeScore: 2, awayScore: 0 },
    { homeName: 'TeamB', awayName: 'TeamC', homeScore: 2, awayScore: 0 },
    { homeName: 'TeamB', awayName: 'TeamD', homeScore: 1, awayScore: 0 },
    { homeName: 'TeamC', awayName: 'TeamD', homeScore: 1, awayScore: 1 },
  ]
  const meta = buildTiebreakMeta(standings.map((s) => s.teamName))
  const sorted = sortGroupStandingsByFifa(standings, matches, meta)
  assert(sorted[0].teamName === 'TeamA', 'H2H: TeamA debe quedar 1°')
  assert(sorted[1].teamName === 'TeamB', 'H2H: TeamB debe quedar 2°')
  console.log('OK escenario 1: head-to-head entre 2 equipos')
}

// Escenario 2: A y B empatados en puntos y H2H (1-1); desempate por dif. general del grupo
{
  const standings = [
    standing('TeamA', 7, 5, 6),
    standing('TeamB', 7, 3, 5),
    standing('TeamC', 0, -5, 0),
    standing('TeamD', 0, -3, 1),
  ]
  const matches = [
    { homeName: 'TeamA', awayName: 'TeamB', homeScore: 1, awayScore: 1 },
    { homeName: 'TeamA', awayName: 'TeamC', homeScore: 3, awayScore: 0 },
    { homeName: 'TeamA', awayName: 'TeamD', homeScore: 2, awayScore: 0 },
    { homeName: 'TeamB', awayName: 'TeamC', homeScore: 2, awayScore: 0 },
    { homeName: 'TeamB', awayName: 'TeamD', homeScore: 2, awayScore: 1 },
    { homeName: 'TeamC', awayName: 'TeamD', homeScore: 0, awayScore: 1 },
  ]
  const meta = buildTiebreakMeta(standings.map((s) => s.teamName))
  const sorted = sortGroupStandingsByFifa(standings, matches, meta)
  assert(sorted[0].teamName === 'TeamA', 'Dif. general: TeamA 1°')
  assert(sorted[1].teamName === 'TeamB', 'Dif. general: TeamB 2°')
  console.log('OK escenario 2: paso 2 dif. general del grupo')
}

console.log('\nTodos los escenarios de desempate pasaron.')
