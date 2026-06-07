/**
 * Marca/desmarca cuentas como testers (User.isTester) para que puedan ver
 * los partidos de prueba (Match.isTest = true).
 *
 * Uso:
 *   npx tsx scripts/set-tester.ts correo1@ejemplo.com correo2@ejemplo.com
 *   npx tsx scripts/set-tester.ts --off correo1@ejemplo.com
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

import { resolveDatabaseUrl } from '../src/lib/database-url'

const prisma = new PrismaClient({ adapter: new PrismaPg(resolveDatabaseUrl()) })

async function main() {
  const args = process.argv.slice(2)
  const off = args.includes('--off')
  const emails = args.filter((arg) => arg !== '--off')

  if (emails.length === 0) {
    console.error('Uso: npx tsx scripts/set-tester.ts [--off] correo1@ejemplo.com ...')
    process.exit(1)
  }

  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      console.warn(`   ⚠️  No existe ningún usuario con el email "${email}"`)
      continue
    }

    await prisma.user.update({ where: { id: user.id }, data: { isTester: !off } })
    console.log(`   ✓ ${user.name} <${email}> → isTester = ${!off}`)
  }
}

main()
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
