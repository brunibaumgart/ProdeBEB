/**
 * Carga manual de predicción para M84 España vs Austria.
 * npx tsx scripts/manual-predictions-m84.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { resolveDatabaseUrl } from '../src/lib/database-url'

const MATCH_ID = 84
const LAMINE_ID = 'cmq2vfsrs00mlewwadt1vt5nt'
const OYARZABAL_ID = 'cmq2vfsio00mjewwat7ttmjnb'
const AUSTRIA_SCORER_ID = 'cmq2vgtol00ulewwarrun59xa' // Marko Arnautović

const PREDICTIONS = [
  {
    userId: 'cmq49dpy4000504kwp3pdxnyz', // moreestef06
    name: 'moreestef06',
    predHome: 2,
    predAway: 1,
    predPenaltiesWinnerId: null,
    homeScorers: [LAMINE_ID, OYARZABAL_ID],
    awayScorers: [AUSTRIA_SCORER_ID],
    label: 'España 2-1 Austria (Lamine, Oyarzabal / Arnautović)',
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
