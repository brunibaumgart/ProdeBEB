/**
 * Renombra usuarios por email y marca cuentas existentes con username elegido.
 *
 * Uso:
 *   npx tsx scripts/set-usernames.ts --mark-existing
 *   npx tsx scripts/set-usernames.ts federicostefanib@gmail.com fedeestef06
 *   npx tsx scripts/set-usernames.ts morestefb@gmail.com moreestef06
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

import { resolveDatabaseUrl } from '../src/lib/database-url'
import { validateUsername } from '../src/lib/auth/username'

const prisma = new PrismaClient({ adapter: new PrismaPg(resolveDatabaseUrl()) })

async function renameUser(email: string, username: string) {
  const validation = validateUsername(username)
  if (!validation.ok) {
    throw new Error(`${username}: ${validation.error}`)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.warn(`   ⚠️  No existe ningún usuario con el email "${email}"`)
    return
  }

  if (
    await prisma.user.findFirst({
      where: {
        name: { equals: validation.username, mode: 'insensitive' },
        NOT: { id: user.id },
      },
      select: { id: true },
    })
  ) {
    throw new Error(`El nombre "${validation.username}" ya está en uso.`)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: validation.username,
      hasChosenUsername: true,
    },
  })

  console.log(`   ✓ ${email} → ${validation.username}`)
}

async function markExistingUsers() {
  const result = await prisma.user.updateMany({
    where: { hasChosenUsername: false },
    data: { hasChosenUsername: true },
  })

  console.log(`   ✓ ${result.count} usuario(s) marcado(s) con username ya elegido`)
}

async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--mark-existing')) {
    await markExistingUsers()
    args.splice(args.indexOf('--mark-existing'), 1)
  }

  for (let index = 0; index < args.length; index += 2) {
    const email = args[index]
    const username = args[index + 1]

    if (!email || !username) {
      console.error('Uso: npx tsx scripts/set-usernames.ts [--mark-existing] email username ...')
      process.exit(1)
    }

    await renameUser(email, username)
  }

  if (args.length === 0 && !process.argv.includes('--mark-existing')) {
    console.error('Uso: npx tsx scripts/set-usernames.ts [--mark-existing] email username ...')
    process.exit(1)
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
