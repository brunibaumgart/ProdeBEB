/**
 * Diagnóstico de bracket predicho para un usuario.
 * npx tsx scripts/debug-user-bracket.ts brunoenzobaumgart@gmail.com
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

import { resolveDatabaseUrl } from '../src/lib/database-url'
import { resolveGroupStandingsFromPredictions, getBestThirds } from '../src/lib/bracket'
import {
  getQualifiedThirdGroupsFromStandings,
  resolveThirdPlaceByAnnexC,
  getThirdPlaceCombinationKey,
  getAnnexCMapping,
} from '../src/lib/bracket/annex-c'
import { resolvePredictedBracket } from '../src/lib/bracket/predicted-bracket'
import fixture from '../data/fixture.json'

const email = process.argv[2] ?? 'brunoenzobaumgart@gmail.com'

const adapter = new PrismaPg(resolveDatabaseUrl())
const prisma = new PrismaClient({ adapter })

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      bracketEntry: {
        include: { slots: true },
      },
    },
  })

  if (!user?.bracketEntry) {
    console.error('Sin bracket entry para', email)
    process.exit(1)
  }

  const entry = user.bracketEntry
  const predictions: Record<number, { predHome: number; predAway: number; predAdvancesTeamId?: string | null }> = {}
  for (const slot of entry.slots) {
    if (slot.predHomeScore == null || slot.predAwayScore == null) continue
    predictions[slot.matchId] = {
      predHome: slot.predHomeScore,
      predAway: slot.predAwayScore,
      predAdvancesTeamId: slot.predAdvancesTeamId,
    }
  }

  const teams = await prisma.team.findMany({
    select: { id: true, name: true, nameEs: true, group: true, iso2: true, flagEmoji: true },
  })
  const teamByName = new Map(teams.map((t) => [t.name, t]))
  const groups = [...new Set(teams.map((t) => t.group))].sort()

  const groupMatches = fixture.matches.filter((m) => m.group)
  const knockoutMatches = fixture.matches.filter((m) => !m.group && m.id >= 73 && m.id <= 104)

  const groupStandings = new Map<string, ReturnType<typeof resolveGroupStandingsFromPredictions>>()

  for (const group of groups) {
    const groupTeams = teams.filter((t) => t.group === group)
    const matches = groupMatches
      .filter((m) => m.group === group)
      .map((m) => ({
        matchId: m.id,
        group: m.group,
        homeName: m.home,
        awayName: m.away,
      }))
    groupStandings.set(
      group,
      resolveGroupStandingsFromPredictions(groupTeams, matches, predictions, group),
    )
  }

  console.log('\n=== TABLAS DE GRUPOS (predichas) ===')
  for (const group of ['A', 'D', 'E']) {
    const s = groupStandings.get(group)
    if (!s) continue
    console.log(`\nGrupo ${group}:`)
    s.forEach((row, i) => {
      const t = teamByName.get(row.teamName)
      console.log(
        `  ${i + 1}. ${t?.nameEs ?? row.teamName} — ${row.points}pts GD${row.goalDiff}`,
      )
    })
  }

  const bestThirds = getBestThirds(groupStandings, 8)
  console.log('\n=== 8 MEJORES TERCEROS ===')
  bestThirds.forEach((s, i) => {
    const t = teamByName.get(s.teamName)
    const group = teams.find((x) => x.name === s.teamName)?.group
    console.log(`  ${i + 1}. ${t?.nameEs} (Grupo ${group}) — ${s.points}pts GD${s.goalDiff}`)
  })

  const qualifiedGroups = getQualifiedThirdGroupsFromStandings(groupStandings, bestThirds)
  const key = getThirdPlaceCombinationKey(qualifiedGroups)
  const mapping = getAnnexCMapping(qualifiedGroups)
  console.log('\n=== ANEXO C ===')
  console.log('Grupos con 3.º clasificado:', qualifiedGroups.join(', '))
  console.log('Clave:', key)
  console.log('Slot 1E (M74) recibe:', mapping?.['1E'] ?? 'sin mapping')

  const thirdByMatch = resolveThirdPlaceByAnnexC(qualifiedGroups, groupStandings)
  console.log('M74 visitante resuelto:', thirdByMatch.get(74))

  const resolved = resolvePredictedBracket(
    groupStandings,
    knockoutMatches.map((m) => ({ id: m.id, homeLabel: m.home, awayLabel: m.away })),
    predictions,
    predictions,
    teamByName,
  )

  const m74 = resolved.get(74)
  console.log('\n=== M74 (1E vs 3.º) ===')
  console.log(
    'Local:',
    m74?.homeTeamName,
    '→',
    teamByName.get(m74?.homeTeamName ?? '')?.nameEs,
  )
  console.log(
    'Visitante:',
    m74?.awayTeamName,
    '→',
    teamByName.get(m74?.awayTeamName ?? '')?.nameEs,
  )

  const germanyMatches = [...resolved.entries()].filter(
    ([, m]) => m.homeTeamName === 'Germany' || m.awayTeamName === 'Germany',
  )
  console.log('\n=== Partidos con Alemania ===')
  for (const [id, m] of germanyMatches) {
    console.log(
      `M${id}: ${teamByName.get(m.homeTeamName ?? '')?.nameEs} vs ${teamByName.get(m.awayTeamName ?? '')?.nameEs}`,
    )
  }

  for (const name of ['Turkey', 'Czech Republic', 'Sweden']) {
    const s = [...groupStandings.values()].flat().find((x) => x.teamName === name)
    console.log(`\n${name}: GF=${s?.goalsFor} GA=${s?.goalsAgainst} pts=${s?.points}`)
  }

  const m82 = resolved.get(82)
  console.log('\n=== M82 (1G vs 3.º) — aquí va Rep. Checa según Anexo C ===')
  console.log(
    `M82: ${teamByName.get(m82?.homeTeamName ?? '')?.nameEs} vs ${teamByName.get(m82?.awayTeamName ?? '')?.nameEs}`,
  )
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
