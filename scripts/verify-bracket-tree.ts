/**
 * Verifica el árbol de la llave: mitades, feeders y downstream por rama.
 * Ejecutar: npx tsx scripts/verify-bracket-tree.ts
 */
import {
  BRACKET_MATCH_PLACEMENTS,
  getBracketMatchPlacement,
  getDownstreamKnockoutMatchIds,
} from '../src/lib/bracket/knockout-bracket-layout'

let failed = false

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(message)
    failed = true
  }
}

// 2.º K (M83) y 1.º K (M87) en mitades opuestas
const m83 = getBracketMatchPlacement(83)
const m87 = getBracketMatchPlacement(87)
assert(m83?.half === 'left', 'M83 (2.º K) debe estar en mitad izquierda')
assert(m87?.half === 'right', 'M87 (1.º K) debe estar en mitad derecha')

// Downstream no cruza de rama
const from83 = getDownstreamKnockoutMatchIds(83)
assert(from83.includes(93) && from83.includes(98) && from83.includes(101), 'M83 alimenta M93→98→101')
assert(!from83.includes(96) && !from83.includes(100) && !from83.includes(102), 'M83 no alimenta mitad derecha')

const from87 = getDownstreamKnockoutMatchIds(87)
assert(from87.includes(96) && from87.includes(100) && from87.includes(102), 'M87 alimenta M96→100→102')
assert(!from87.includes(93) && !from87.includes(98) && !from87.includes(101), 'M87 no alimenta mitad izquierda')

// Sin solapamiento de filas dentro de cada columna
for (const round of ['Round of 32', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Final']) {
  const slots = BRACKET_MATCH_PLACEMENTS.filter((slot) => slot.round === round)
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i]
      const b = slots[j]
      const overlap = a.row < b.row + b.rowSpan && b.row < a.row + a.rowSpan
      assert(!overlap, `Solapamiento en ${round}: M${a.matchId} vs M${b.matchId}`)
    }
  }
}

if (failed) process.exit(1)
console.log('OK: árbol de llave coherente con fixture FIFA.')
