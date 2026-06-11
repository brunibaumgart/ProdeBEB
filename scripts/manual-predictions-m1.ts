/**
 * Carga manual de predicciones Fecha a Fecha (soporte).
 * npx tsx scripts/manual-predictions-m1.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

import { resolveDatabaseUrl } from '../src/lib/database-url'

const MATCH_ID = 1 // México vs Sudáfrica

const PREDICTIONS = [
  {
    email: 'camisierra2207@gmail.com',
    name: 'pio',
    predHome: 2,
    predAway: 0,
    label: 'México gana 2-0',
  },
  {
    email: 'joaquinvicente20@gmail.com',
    name: 'joaquin',
    predHome: 2,
    predAway: 1,
    label: 'México gana 2-1',
  },
  {
    email: 'nicosuarez272@gmail.com',
    name: 'nicky',
    predHome: 2,
    predAway: 1,
    label: 'México gana 2-1',
  },
  {
    email: 'mauroleanbaez@gmail.com',
    name: 'maurito',
    predHome: 2,
    predAway: 0,
    label: 'México gana 2-0',
  },
] as const

const prisma = new PrismaClient({ adapter: new PrismaPg(resolveDatabaseUrl()) })

async function main() {
  const match = await prisma.match.findUnique({
    where: { id: MATCH_ID },
    include: { homeTeam: true, awayTeam: true },
  })

  if (!match) throw new Error(`Partido M${MATCH_ID} no encontrado`)

  console.log(`Partido M${MATCH_ID}: ${match.homeTeam?.nameEs} vs ${match.awayTeam?.nameEs}`)

  for (const entry of PREDICTIONS) {
    const user = await prisma.user.findUnique({ where: { email: entry.email } })
    if (!user) {
      throw new Error(`Usuario no encontrado: ${entry.email}`)
    }

    const prediction = await prisma.prediction.upsert({
      where: {
        userId_matchId: { userId: user.id, matchId: MATCH_ID },
      },
      create: {
        userId: user.id,
        matchId: MATCH_ID,
        predHome: entry.predHome,
        predAway: entry.predAway,
      },
      update: {
        predHome: entry.predHome,
        predAway: entry.predAway,
      },
    })

    console.log(
      `✓ ${user.name} (${user.email}): ${entry.predHome}-${entry.predAway} (${entry.label}) [${prediction.id}]`,
    )
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
