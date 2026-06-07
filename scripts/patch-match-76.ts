import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { resolveDatabaseUrl } from '../src/lib/database-url'

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg(resolveDatabaseUrl()) })

  const before = await prisma.match.findUnique({
    where: { id: 76 },
    select: { id: true, homeLabel: true, awayLabel: true },
  })
  console.log('Antes:', before)

  const updated = await prisma.match.update({
    where: { id: 76 },
    data: { homeLabel: '1st Group C' },
    select: { id: true, homeLabel: true, awayLabel: true },
  })
  console.log('Después:', updated)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
