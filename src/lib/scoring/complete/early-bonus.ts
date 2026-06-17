import { prisma } from '@/lib/prisma'

/** El bonus temprano ya no aplica; se mantiene el campo en cero. */
export async function recalculateEarlyBonusForEntry(entryId: string): Promise<number> {
  await prisma.bracketEntry.update({
    where: { id: entryId },
    data: { pointsEarlyBonus: 0 },
  })
  return 0
}

export async function recalculateEarlyBonusForUser(userId: string): Promise<void> {
  const entry = await prisma.bracketEntry.findUnique({ where: { userId } })
  if (!entry) return
  await recalculateEarlyBonusForEntry(entry.id)
}
