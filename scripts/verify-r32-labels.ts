/**
 * Verifica que ningún slot de 1er puesto aparezca en más de un partido R32.
 * Ejecutar: npx tsx scripts/verify-r32-labels.ts
 */
import fixture from '../data/fixture.json'

const r32 = fixture.matches.filter((m) => m.round === 'Round of 32')

function extractGroup(label: string): string | null {
  const first = label.match(/^1st Group ([A-L])$/)
  if (first) return first[1]
  const second = label.match(/^2nd Group ([A-L])$/)
  if (second) return second[1]
  return null
}

const firstSlots = new Map<string, number[]>()
const secondSlots = new Map<string, number[]>()

for (const match of r32) {
  for (const side of [match.home, match.away]) {
    const g1 = side.match(/^1st Group ([A-L])$/)
    if (g1) {
      const list = firstSlots.get(g1[1]) ?? []
      list.push(match.id)
      firstSlots.set(g1[1], list)
    }
    const g2 = side.match(/^2nd Group ([A-L])$/)
    if (g2) {
      const list = secondSlots.get(g2[1]) ?? []
      list.push(match.id)
      secondSlots.set(g2[1], list)
    }
  }
}

let failed = false

for (const [group, ids] of firstSlots) {
  if (ids.length > 1) {
    console.error(`1st Group ${group} aparece en partidos ${ids.join(', ')}`)
    failed = true
  }
}

for (const [group, ids] of secondSlots) {
  if (ids.length > 1) {
    console.error(`2nd Group ${group} aparece en partidos ${ids.join(', ')}`)
    failed = true
  }
}

// M76 oficial: 1C vs 2F
const m76 = r32.find((m) => m.id === 76)
if (m76?.home !== '1st Group C' || m76?.away !== '2nd Group F') {
  console.error('M76 incorrecto:', m76?.home, 'vs', m76?.away)
  failed = true
}

if (failed) {
  process.exit(1)
}

console.log(`OK: ${r32.length} partidos R32, sin slots duplicados.`)
