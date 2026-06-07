/**
 * Genera data/annex_c_third_place.json desde la tabla Wikipedia (Anexo C FIFA).
 * Ejecutar: npx tsx scripts/generate-annex-c.ts
 */
import fs from 'fs'
import path from 'path'

const SLOTS = ['1A', '1B', '1D', '1E', '1G', '1I', '1K', '1L'] as const

const wikiPath = path.join(
  process.cwd(),
  '.cursor/projects/Users-brunoenzobaumgart-Documents-GitHub-Prode/agent-tools/6a70e8e2-a298-4741-ba87-b124d18a704e.txt'
)

// Fallback: parse from embedded copy if agent file missing
const sourcePath = fs.existsSync(wikiPath)
  ? wikiPath
  : path.join(process.cwd(), 'scripts/annex_c_wikipedia_source.txt')

if (!fs.existsSync(sourcePath)) {
  console.error('Fuente Wikipedia no encontrada. Copiá la tabla a scripts/annex_c_wikipedia_source.txt')
  process.exit(1)
}

const content = fs.readFileSync(sourcePath, 'utf-8')
const lines = content.split('\n')

const combinations: Record<string, Record<string, string>> = {}
let count = 0

for (const line of lines) {
  const match = line.match(/^\| (\d+) \| ([A-L]) \| ([A-L]) \| ([A-L]) \| ([A-L]) \| ([A-L]) \| ([A-L]) \| ([A-L]) \| ([A-L]) \| (3[A-L]) \| (3[A-L]) \| (3[A-L]) \| (3[A-L]) \| (3[A-L]) \| (3[A-L]) \| (3[A-L]) \| (3[A-L]) \|/)
  if (!match) continue

  const groups = [match[2], match[3], match[4], match[5], match[6], match[7], match[8], match[9]].sort()
  const key = groups.join('')
  const assignments = [match[10], match[11], match[12], match[13], match[14], match[15], match[16], match[17]]

  const mapping: Record<string, string> = {}
  SLOTS.forEach((slot, i) => {
    mapping[slot] = assignments[i]
  })

  if (combinations[key]) {
    console.warn(`Duplicado: ${key}`)
  }
  combinations[key] = mapping
  count++
}

const output = {
  source: 'FIFA World Cup 2026 Regulations Annex C (via Wikipedia knockout stage table)',
  slotToMatchId: {
    '1A': 79,
    '1B': 85,
    '1D': 81,
    '1E': 74,
    '1G': 82,
    '1I': 77,
    '1K': 87,
    '1L': 80,
  },
  combinations,
}

const outPath = path.join(process.cwd(), 'data/annex_c_third_place.json')
fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n')

console.log(`Generado ${outPath}: ${count} combinaciones (esperado 495)`)
if (count !== 495) {
  console.warn('⚠️  Cantidad distinta a 495 — revisar parsing')
  process.exit(1)
}

// Verificar caso conocido CDEFGIKL (fila 37 Wikipedia / Anexo C FIFA)
const known = combinations['CDEFGIKL']
if (known?.['1A'] !== '3C' || known?.['1E'] !== '3D' || known?.['1K'] !== '3L') {
  console.error('Verificación CDEFGIKL falló:', known)
  process.exit(1)
}
console.log('OK verificación CDEFGIKL')
