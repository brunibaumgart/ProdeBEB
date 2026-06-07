import { prisma } from '@/lib/prisma'

const FALLBACK_LOCK = {
  lockAt: new Date('2026-06-11T22:00:00.000Z'),
  timeArg: '19:00',
}

export async function getWorldCupAwardsLockInfo() {
  const firstMatch = await prisma.match.findFirst({
    where: {
      isTest: false,
      homeTeamId: { not: null },
      awayTeamId: { not: null },
    },
    orderBy: { date: 'asc' },
    select: { date: true, timeArg: true },
  })

  if (!firstMatch) return FALLBACK_LOCK

  return {
    lockAt: firstMatch.date,
    timeArg: firstMatch.timeArg,
  }
}

export async function getWorldCupAwardsLockAt(): Promise<Date> {
  const info = await getWorldCupAwardsLockInfo()
  return info.lockAt
}

export function areWorldCupAwardsLocked(lockAt: Date): boolean {
  return Date.now() >= lockAt.getTime()
}
