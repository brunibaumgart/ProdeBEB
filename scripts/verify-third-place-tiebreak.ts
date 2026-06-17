/**
 * Verifica desempate manual de mejores terceros.
 * npx tsx scripts/verify-third-place-tiebreak.ts
 */
import type { Standing } from '../src/lib/bracket'
import {
  buildThirdPlaceTiebreakBuckets,
  getBestThirdsWithTiebreak,
  getRelevantThirdPlaceTiebreakBuckets,
  isThirdPlaceTiebreakComplete,
} from '../src/lib/bracket/third-place-tiebreak'

function standing(
  teamName: string,
  points: number,
  goalDiff = 0,
  goalsFor = 0,
): Standing {
  return {
    teamName,
    played: 3,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor,
    goalsAgainst: goalsFor - goalDiff,
    goalDiff,
    points,
  }
}

function buildStandings(entries: Array<{ group: string; third: Standing }>) {
  const map = new Map<string, Standing[]>()

  for (const entry of entries) {
    map.set(entry.group, [
      standing(`${entry.group}-1`, 9),
      standing(`${entry.group}-2`, 6),
      entry.third,
      standing(`${entry.group}-4`, 0),
    ])
  }

  return map
}

const standings = buildStandings([
  { group: 'A', third: standing('A3', 4) },
  { group: 'B', third: standing('B3', 4) },
  { group: 'C', third: standing('C3', 4) },
  { group: 'D', third: standing('D3', 4) },
  { group: 'E', third: standing('E3', 4) },
  { group: 'F', third: standing('F3', 4) },
  { group: 'G', third: standing('G3', 3) },
  { group: 'H', third: standing('H3', 3) },
  { group: 'I', third: standing('I3', 3) },
  { group: 'J', third: standing('J3', 3) },
  { group: 'K', third: standing('K3', 2) },
  { group: 'L', third: standing('L3', 1) },
])

const relevant = getRelevantThirdPlaceTiebreakBuckets(standings)
if (relevant.length !== 2) {
  console.error('Se esperaban 2 buckets relevantes (4pts y 3pts)', relevant)
  process.exit(1)
}

if (!relevant.some((bucket) => bucket.key === '4' && bucket.teams.length === 6)) {
  console.error('Bucket de 4pts mal armado')
  process.exit(1)
}

if (!isThirdPlaceTiebreakComplete(standings, null)) {
  // expected
} else {
  console.error('Sin orden manual no debería estar completo')
  process.exit(1)
}

const manualOrder = {
  '4': ['F3', 'A3', 'B3', 'C3', 'D3', 'E3'],
  '3': ['J3', 'G3', 'H3', 'I3'],
}

if (!isThirdPlaceTiebreakComplete(standings, manualOrder)) {
  console.error('Orden manual válido debería completar desempate')
  process.exit(1)
}

const best = getBestThirdsWithTiebreak(standings, manualOrder, 8)
const names = best.map((team) => team.teamName)

if (
  names.join(',') !==
  'F3,A3,B3,C3,D3,E3,J3,G3'.replace(/\s/g, '')
) {
  console.error('Top 8 incorrecto:', names)
  process.exit(1)
}

const buckets = buildThirdPlaceTiebreakBuckets(standings)
const irrelevant = buckets.filter((bucket) => !bucket.relevant)
if (irrelevant.length !== 2 || irrelevant.some((bucket) => bucket.points !== 2 && bucket.points !== 1)) {
  console.error('Buckets 2pts y 1pts no deberían ser relevantes')
  process.exit(1)
}

console.log('OK: desempate manual de mejores terceros verificado')
