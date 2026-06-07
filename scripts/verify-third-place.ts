/**
 * Verifica parsing de perdedores para M103 (tercer puesto).
 * Ejecutar: npx tsx scripts/verify-third-place.ts
 */

function resolveLoserPlaceholder(
  placeholder: string,
  resolved: Map<number, { homeTeamName: string | null; awayTeamName: string | null }>
): string | null {
  const loserMatch = placeholder.match(/^__loser_of_(\d+)__(.+)$/)
  if (!loserMatch) return null
  const sourceId = parseInt(loserMatch[1], 10)
  const winnerName = loserMatch[2]
  const source = resolved.get(sourceId)
  if (!source?.homeTeamName || !source?.awayTeamName) return null
  return source.homeTeamName === winnerName ? source.awayTeamName : source.homeTeamName
}

const resolved = new Map([
  [101, { homeTeamName: 'Spain', awayTeamName: 'France' }],
  [102, { homeTeamName: 'Germany', awayTeamName: 'Brazil' }],
])

const home = resolveLoserPlaceholder('__loser_of_101__Spain', resolved)
const away = resolveLoserPlaceholder('__loser_of_102__Brazil', resolved)

if (home !== 'France' || away !== 'Germany') {
  console.error('Falló resolución tercer puesto:', { home, away })
  process.exit(1)
}

// Regresión: split viejo usaba índices incorrectos
const broken = '__loser_of_101__Spain'.split('__')
if (broken[2] === 'loser_of_101') {
  console.error('Sanity check split cambió — revisar parser')
  process.exit(1)
}

console.log('OK: tercer puesto — France vs Germany (perdedores de semis)')
