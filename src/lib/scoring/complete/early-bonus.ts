import { BRACKET_LOCK_DATE } from '@/lib/bracket/lock'
import { calculateEarlyBonusPoints } from '@/lib/points'
import { prisma } from '@/lib/prisma'

export async function recalculateEarlyBonusForEntry(entryId: string): Promise<number> {
  const entry = await prisma.bracketEntry.findUnique({
    where: { id: entryId },
    include: { slots: { select: { points: true } } },
  })

  if (!entry) return 0

  const slotPoints = entry.slots.reduce((sum, slot) => sum + (slot.points ?? 0), 0)
  const subtotal = slotPoints + entry.pointsPositions + entry.pointsChampion

  const qualifiesForEarlyBonus =
    entry.locked && entry.lockedAt != null && entry.lockedAt < BRACKET_LOCK_DATE

  const pointsEarlyBonus = qualifiesForEarlyBonus
    ? calculateEarlyBonusPoints(subtotal)
    : 0

  await prisma.bracketEntry.update({
    where: { id: entryId },
    data: { pointsEarlyBonus },
  })

  return pointsEarlyBonus
}

export async function recalculateEarlyBonusForUser(userId: string): Promise<void> {
  const entry = await prisma.bracketEntry.findUnique({ where: { userId } })
  if (!entry) return
  await recalculateEarlyBonusForEntry(entry.id)
}
