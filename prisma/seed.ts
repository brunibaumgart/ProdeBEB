import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

import { resolveDatabaseUrl } from '../src/lib/database-url'

const adapter = new PrismaPg(resolveDatabaseUrl())
const prisma = new PrismaClient({ adapter })

// Alias de nombres de país en el CSV → name_es en teams_data.json
const COUNTRY_ALIASES: Record<string, string> = {
  Congo: 'República Democrática del Congo',
}

function parseMatchDate(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)
  // Argentina es UTC-3 — sumamos 3 horas para guardar en UTC
  return new Date(Date.UTC(year, month - 1, day, hours + 3, minutes))
}

function parseKnockoutLabel(label: string): {
  fromMatchId?: number
  fromPosition?: string
} {
  const winner = label.match(/^Winner M(\d+)$/)
  if (winner) return { fromMatchId: parseInt(winner[1]), fromPosition: 'winner' }

  const loser = label.match(/^Loser M(\d+)$/)
  if (loser) return { fromMatchId: parseInt(loser[1]), fromPosition: 'loser' }

  if (/^1st Group/.test(label)) return { fromPosition: '1st' }
  if (/^2nd Group/.test(label)) return { fromPosition: '2nd' }
  if (/^3rd best/.test(label)) return { fromPosition: '3rd' }

  return {}
}

async function main() {
  console.log('🌱 Iniciando seed de ProdeBEB...')

  const fixtureData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data/fixture.json'), 'utf-8')
  )
  const teamsData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data/teams_data.json'), 'utf-8')
  )
  const csvContent = fs.readFileSync(
    path.join(process.cwd(), 'data/mundial_2026_jugadores.csv'),
    'utf-8'
  )
  const { data: playersRaw } = Papa.parse<{
    pais: string
    nombre_completo: string
    club: string
    posicion: string
    partidos_internacionales: string
  }>(csvContent, { header: true, skipEmptyLines: true })

  // Limpiar en orden para respetar FK
  console.log('🗑️  Limpiando datos anteriores...')
  await prisma.bracketSlot.deleteMany()
  await prisma.bracketEntry.deleteMany()
  await prisma.prediction.deleteMany()
  await prisma.tournamentMember.deleteMany()
  await prisma.tournament.deleteMany()
  await prisma.match.deleteMany()
  await prisma.player.deleteMany()
  await prisma.team.deleteMany()
  await prisma.venue.deleteMany()

  // 1. Venues
  console.log('🏟️  Creando estadios...')
  const venueMap: Record<string, string> = {}
  for (const v of fixtureData.venues) {
    const venue = await prisma.venue.create({
      data: { name: v.name, city: v.city, country: v.country, capacity: v.capacity },
    })
    venueMap[v.name] = venue.id
  }
  console.log(`   ✓ ${fixtureData.venues.length} estadios`)

  // 2. Teams
  console.log('🏳️  Creando selecciones...')
  const teamMapByName: Record<string, string> = {}
  const teamMapByNameEs: Record<string, string> = {}
  for (const t of teamsData.teams) {
    const team = await prisma.team.create({
      data: {
        name: t.name,
        nameEs: t.name_es,
        group: t.group,
        iso2: t.iso2,
        confederation: t.confederation,
        flagEmoji: t.flag_emoji,
        kitPrimary: t.kit_primary,
        kitSecondary: t.kit_secondary,
        kitThird: t.kit_third ?? null,
        textOnPrimary: t.text_on_primary,
      },
    })
    teamMapByName[t.name] = team.id
    teamMapByNameEs[t.name_es] = team.id
  }
  console.log(`   ✓ ${teamsData.teams.length} selecciones`)

  // 3. Players
  console.log('👤 Creando jugadores...')
  let playerCount = 0
  let skipped = 0
  for (const p of playersRaw) {
    const countryName = COUNTRY_ALIASES[p.pais] ?? p.pais
    const teamId = teamMapByNameEs[countryName]
    if (!teamId) {
      skipped++
      continue
    }
    await prisma.player.create({
      data: {
        name: p.nombre_completo,
        position: p.posicion,
        club: p.club || '',
        internationalMatches: parseInt(p.partidos_internacionales) || 0,
        teamId,
      },
    })
    playerCount++
  }
  console.log(`   ✓ ${playerCount} jugadores (${skipped} omitidos)`)

  // 4. Matches
  console.log('⚽ Creando partidos...')
  for (const m of fixtureData.matches) {
    const venueId = venueMap[m.venue]
    if (!venueId) {
      console.warn(`   ⚠ Estadio no encontrado: ${m.venue}`)
      continue
    }

    const isGroupStage = m.round === 'Group Stage'
    let homeTeamId: string | null = null
    let awayTeamId: string | null = null
    let homeLabel: string | null = null
    let awayLabel: string | null = null
    let homeFromMatchId: number | null = null
    let awayFromMatchId: number | null = null
    let homeFromPosition: string | null = null
    let awayFromPosition: string | null = null

    if (isGroupStage) {
      homeTeamId = teamMapByName[m.home] ?? null
      awayTeamId = teamMapByName[m.away] ?? null
    } else {
      homeLabel = m.home
      awayLabel = m.away
      const hp = parseKnockoutLabel(m.home)
      const ap = parseKnockoutLabel(m.away)
      homeFromMatchId = hp.fromMatchId ?? null
      awayFromMatchId = ap.fromMatchId ?? null
      homeFromPosition = hp.fromPosition ?? null
      awayFromPosition = ap.fromPosition ?? null
    }

    await prisma.match.create({
      data: {
        id: m.id,
        round: m.round,
        matchday: m.matchday ?? null,
        group: m.group ?? null,
        date: parseMatchDate(m.date, m.time_arg),
        timeArg: m.time_arg,
        venueId,
        homeTeamId,
        awayTeamId,
        homeLabel,
        awayLabel,
        homeFromMatchId,
        awayFromMatchId,
        homeFromPosition,
        awayFromPosition,
        homeScore: m.home_score ?? null,
        awayScore: m.away_score ?? null,
        status: m.status,
      },
    })
  }
  console.log(`   ✓ ${fixtureData.matches.length} partidos`)

  // 5. Torneo público global
  console.log('🏆 Creando torneo global...')
  await prisma.tournament.create({
    data: {
      name: 'ProdeBEB Global',
      description: 'El torneo público de todos los jugadores de ProdeBEB. Mundial 2026.',
      code: 'GLOBAL',
      isPublic: true,
      modeComplete: true,
      modeMatchday: true,
      modeScorers: true,
      createdById: null,
    },
  })
  console.log('   ✓ Torneo global creado')

  console.log('\n✅ Seed completado exitosamente!')
  console.log(`   🏟️  ${fixtureData.venues.length} estadios`)
  console.log(`   🏳️  ${teamsData.teams.length} selecciones`)
  console.log(`   👤 ${playerCount} jugadores`)
  console.log(`   ⚽ ${fixtureData.matches.length} partidos`)
  console.log(`   🏆 1 torneo global`)
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
