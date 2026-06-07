import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

import { resolveDatabaseUrl } from '../src/lib/database-url'
import { getArgentinaTodayBounds, getArgentinaTomorrowBounds } from '../src/lib/time'

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg(resolveDatabaseUrl()) })
  const today = getArgentinaTodayBounds()
  const tomorrow = getArgentinaTomorrowBounds()

  console.log('Hoy ARG:', today.gte.toISOString(), '-', today.lte.toISOString())
  console.log('Mañana ARG:', tomorrow.dateStr)

  for (const label of ['isTest', 'HOY', 'MAÑANA'] as const) {
    const matches =
      label === 'isTest'
        ? await prisma.match.findMany({
            where: { isTest: true },
            include: { homeTeam: true, awayTeam: true },
            orderBy: { date: 'asc' },
          })
        : await prisma.match.findMany({
            where: {
              date:
                label === 'HOY'
                  ? { gte: today.gte, lte: today.lte }
                  : { gte: tomorrow.gte, lte: tomorrow.lte },
            },
            include: { homeTeam: true, awayTeam: true },
            orderBy: { date: 'asc' },
          })

    console.log(`\n${label}: ${matches.length}`)
    for (const m of matches) {
      console.log(
        `  M${m.id} ${m.homeTeam?.nameEs ?? m.homeLabel} vs ${m.awayTeam?.nameEs ?? m.awayLabel} | ${m.timeArg} | ${m.date.toISOString()} | isTest=${m.isTest} | ${m.status}`
      )
    }
  }

  const guatemala = await prisma.team.findFirst({
    where: { name: { contains: 'Guatemala', mode: 'insensitive' } },
  })
  console.log('\nGuatemala en DB:', guatemala?.name ?? 'NO EXISTE')

  await prisma.$disconnect()
}

main()
