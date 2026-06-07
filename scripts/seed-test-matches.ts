/**
 * Amistosos de prueba (isTest = true). Fechas relativas a hoy/mañana en hora Argentina.
 * Solo visibles para admin y testers.
 *
 * Ejecutar: npm run seed:test-matches
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

import { resolveDatabaseUrl } from '../src/lib/database-url'
import {
  getArgentinaTodayDateStr,
  getArgentinaTomorrowBounds,
  matchDateUTC,
} from '../src/lib/time'

const prisma = new PrismaClient({ adapter: new PrismaPg(resolveDatabaseUrl()) })

const GENERIC_PLAYERS = [
  { name: 'Arquero Test', position: 'Portero' },
  { name: 'Defensor Test', position: 'Defensa' },
  { name: 'Mediocampista Test', position: 'Mediocampista' },
  { name: 'Delantero Test', position: 'Delantero' },
] as const

const TEST_TEAMS = [
  {
    name: 'Guatemala',
    nameEs: 'Guatemala',
    group: 'TEST',
    iso2: 'GT',
    confederation: 'CONCACAF',
    flagEmoji: '🇬🇹',
    kitPrimary: '#0067CE',
    kitSecondary: '#FFFFFF',
    kitThird: '#002855',
    textOnPrimary: '#FFFFFF',
  },
  {
    name: 'Northern Ireland',
    nameEs: 'Irlanda del Norte',
    group: 'TEST',
    iso2: 'GB',
    confederation: 'UEFA',
    flagEmoji: '🇬🇧',
    kitPrimary: '#009639',
    kitSecondary: '#FFFFFF',
    kitThird: '#FF8200',
    textOnPrimary: '#FFFFFF',
  },
  {
    name: 'Peru',
    nameEs: 'Perú',
    group: 'TEST',
    iso2: 'PE',
    confederation: 'CONMEBOL',
    flagEmoji: '🇵🇪',
    kitPrimary: '#D91023',
    kitSecondary: '#FFFFFF',
    kitThird: '#003DA5',
    textOnPrimary: '#FFFFFF',
  },
] as const

const ALL_TEST_MATCH_IDS = [9001, 9002, 9003, 9004, 9005, 901, 902, 903]

async function ensureTestTeam(data: (typeof TEST_TEAMS)[number]) {
  return prisma.team.upsert({
    where: { name: data.name },
    create: { ...data, isTest: true },
    update: { ...data, isTest: true },
  })
}

async function ensureGenericPlayers(teamId: string) {
  await prisma.player.deleteMany({ where: { teamId } })
  for (const player of GENERIC_PLAYERS) {
    await prisma.player.create({
      data: {
        teamId,
        name: player.name,
        position: player.position,
        club: 'Test FC',
        internationalMatches: 0,
      },
    })
  }
}

async function main() {
  const todayStr = getArgentinaTodayDateStr()
  const { dateStr: tomorrowStr } = getArgentinaTomorrowBounds()

  console.log(`📅 Hoy ARG: ${todayStr} · Mañana ARG: ${tomorrowStr}`)

  const venue = await prisma.venue.findFirst({ orderBy: { name: 'asc' } })
  if (!venue) throw new Error('No hay estadios. Corré npm run db:seed primero.')

  console.log('\n👕 Selecciones de prueba con jugadores genéricos...')
  for (const teamData of TEST_TEAMS) {
    const team = await ensureTestTeam(teamData)
    await ensureGenericPlayers(team.id)
    console.log(`   ✓ ${team.nameEs}`)
  }

  const teamIds = new Map<string, string>()
  for (const name of [
    'Ecuador',
    'Guatemala',
    'Colombia',
    'Jordan',
    'Netherlands',
    'Uzbekistan',
    'France',
    'Northern Ireland',
    'Peru',
    'Spain',
  ]) {
    const team = await prisma.team.findUnique({ where: { name } })
    if (!team) throw new Error(`Selección no encontrada: ${name}`)
    teamIds.set(name, team.id)
  }

  const specs = [
    {
      id: 9001,
      homeName: 'Ecuador',
      awayName: 'Guatemala',
      dateStr: todayStr,
      timeArg: '17:00',
    },
    {
      id: 9005,
      homeName: 'Colombia',
      awayName: 'Jordan',
      dateStr: todayStr,
      timeArg: '20:00',
    },
    {
      id: 9002,
      homeName: 'Netherlands',
      awayName: 'Uzbekistan',
      dateStr: tomorrowStr,
      timeArg: '15:45',
    },
    {
      id: 9003,
      homeName: 'France',
      awayName: 'Northern Ireland',
      dateStr: tomorrowStr,
      timeArg: '16:10',
    },
    {
      id: 9004,
      homeName: 'Peru',
      awayName: 'Spain',
      dateStr: tomorrowStr,
      timeArg: '23:00',
    },
  ] as const

  // Quitar amistosos viejos que ya no usamos
  const staleIds = ALL_TEST_MATCH_IDS.filter((id) => !specs.some((spec) => spec.id === id))
  if (staleIds.length > 0) {
    await prisma.matchGoal.deleteMany({ where: { matchId: { in: staleIds } } })
    await prisma.predictionScorer.deleteMany({
      where: { prediction: { matchId: { in: staleIds } } },
    })
    await prisma.prediction.deleteMany({ where: { matchId: { in: staleIds } } })
    await prisma.match.deleteMany({ where: { id: { in: staleIds } } })
    console.log(`\n🧹 Eliminados partidos de prueba obsoletos: ${staleIds.join(', ')}`)
  }

  console.log('\n⚽ Cargando amistosos...')
  for (const spec of specs) {
    const homeTeamId = teamIds.get(spec.homeName)!
    const awayTeamId = teamIds.get(spec.awayName)!

    await prisma.match.upsert({
      where: { id: spec.id },
      create: {
        id: spec.id,
        round: 'Amistoso',
        date: matchDateUTC(spec.dateStr, spec.timeArg),
        timeArg: spec.timeArg,
        venueId: venue.id,
        homeTeamId,
        awayTeamId,
        status: 'scheduled',
        isTest: true,
      },
      update: {
        round: 'Amistoso',
        date: matchDateUTC(spec.dateStr, spec.timeArg),
        timeArg: spec.timeArg,
        venueId: venue.id,
        homeTeamId,
        awayTeamId,
        status: 'scheduled',
        isTest: true,
        homeScore: null,
        awayScore: null,
      },
    })

    const dayLabel = spec.dateStr === todayStr ? 'HOY' : 'MAÑANA'
    console.log(
      `   ✓ M${spec.id} ${spec.homeName} vs ${spec.awayName} · ${dayLabel} ${spec.timeArg} ARG`
    )
  }

  console.log('\n✅ Listo. Solo admin y testers los ven en Fecha a Fecha / Prode.')
  console.log('   Admin: ADMIN_USER_ID en .env.local')
  console.log('   Testers: TESTER_USER_IDS o npx tsx scripts/set-tester.ts email@...')
}

main()
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
