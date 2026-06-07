/**
 * Verifica lookup Anexo C FIFA.
 * Ejecutar: npx tsx scripts/verify-annex-c.ts
 */
import annexC from '../data/annex_c_third_place.json'
import { getAnnexCMapping, getThirdPlaceCombinationKey } from '../src/lib/bracket/annex-c'

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
}

assert(Object.keys(annexC.combinations).length === 495, '495 combinaciones')
assert(getThirdPlaceCombinationKey(['C', 'D', 'E', 'F', 'G', 'I', 'K', 'L']) === 'CDEFGIKL', 'clave')

const mapping = getAnnexCMapping(['C', 'D', 'E', 'F', 'G', 'I', 'K', 'L'])
assert(mapping !== null, 'mapping existe')
assert(mapping!['1A'] === '3C', '1A → 3C')
assert(mapping!['1E'] === '3D', '1E → 3D')
assert(mapping!['1K'] === '3L', '1K → 3L')

// Escenario fila 1 Wikipedia: clasifican EFGHIJKL
const m1 = getAnnexCMapping(['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'])
assert(m1?.['1A'] === '3E', 'escenario 1: 1A → 3E')

console.log('OK Anexo C: 495 combinaciones verificadas.')
