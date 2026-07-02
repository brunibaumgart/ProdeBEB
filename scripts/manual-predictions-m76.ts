/**
 * Carga manual de predicciones para M76 Brasil vs Japón.
 * npx tsx scripts/manual-predictions-m76.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { resolveDatabaseUrl } from '../src/lib/database-url'

const MATCH_ID = 76
const VINICIUS_ID = 'cmq2vdvbk0082ewwasy2moph5'
const JAPAN_TEAM_ID = 'cmq2vcycl0011ewwamh26q1w3'

const PREDICTIONS = [
  {
    userId: 'cmq49dpy4000504kwp3pdxnyz', // moreestef06
    name: 'moreestef06',
    predHome: 3,
    predAway: 1,
    predPenaltiesWinnerId: null,
    homeScorers: [VINICIUS_ID, VINICIUS_ID],
    awayScorers: [] as string[],
    label: 'Brasil 3-1 Japón (2 goles Vinicius)',
  },
  {
    userId: 'cmq47phzu000004l12uke42qq', // fedeestef06
    name: 'fedeestef06',
    predHome: 1,
    predAway: 1,
    predPenaltiesWinnerId: JAPAN_TEAM_ID,
    homeScorers: [] as string[],
    awayScorers: [] as string[],
    label: 'Empate 1-1, Japón gana por penales',
  },
] as const

const prisma = new PrismaClient({ adapter: new PrismaPg(resolveDatabaseUrl()) })

async function main() {
  const match = await prisma.match.findUnique({
    where: { id: MATCH_ID },
    include: { homeTeam: true, awayTeam: true },
  })

  if (!match) throw new Error(`Partido M${MATCH_ID} no encontrado`)
  console.log(`Partido M${MATCH_ID}: ${match.homeTeam?.nameEs} vs ${match.awayTeam?.nameEs} (${match.round}, ${match.status})`)

  for (const entry of PREDICTIONS) {
    const existing = await prisma.prediction.findUnique({
      where: { userId_matchId: { userId: entry.userId, matchId: MATCH_ID } },
    })

    if (existing) {
      console.log(`⚠️  ${entry.name} ya tiene predicción (${existing.predHome}-${existing.predAway}), se saltea.`)
      continue
    }

    const prediction = await prisma.prediction.create({
      data: {
        userId: entry.userId,
        matchId: MATCH_ID,
        predHome: entry.predHome,
        predAway: entry.predAway,
        predPenaltiesWinnerId: entry.predPenaltiesWinnerId ?? null,
        scorers: {
          create: [
            ...entry.homeScorers.map((playerId) => ({ playerId, isHome: true })),
            ...entry.awayScorers.map((playerId) => ({ playerId, isHome: false })),
          ],
        },
      },
    })

    console.log(`✓ ${entry.name}: ${entry.label} (id: ${prediction.id})`)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
