import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const teams = await prisma.team.findMany({ select: { id: true, name: true, nameEs: true }, orderBy: { nameEs: 'asc' } })
console.log(teams.map(t => `${t.id}: ${t.nameEs} (${t.name})`).join('\n'))
console.log('TOTAL:', teams.length)
await prisma.$disconnect()
