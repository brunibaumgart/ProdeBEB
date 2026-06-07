import { prisma } from '@/lib/prisma'

export async function getBracketEntryForUser(userId: string) {
  return prisma.bracketEntry.findUnique({
    where: { userId },
    include: {
      slots: {
        orderBy: { matchId: 'asc' },
      },
    },
  })
}

export async function getOrCreateBracketEntry(userId: string) {
  const existing = await getBracketEntryForUser(userId)
  if (existing) return existing

  return prisma.bracketEntry.create({
    data: { userId },
    include: { slots: true },
  })
}

export type BracketSlotPrediction = {
  predHome: number
  predAway: number
  predAdvancesTeamId?: string | null
  predDecidedIn?: string | null
}

export function slotsToPredictionsMap(
  slots: {
    matchId: number
    predHomeScore: number | null
    predAwayScore: number | null
    predAdvancesTeamId?: string | null
    predDecidedIn?: string | null
  }[]
): Record<number, BracketSlotPrediction> {
  const map: Record<number, BracketSlotPrediction> = {}
  for (const slot of slots) {
    if (slot.predHomeScore != null && slot.predAwayScore != null) {
      map[slot.matchId] = {
        predHome: slot.predHomeScore,
        predAway: slot.predAwayScore,
        predAdvancesTeamId: slot.predAdvancesTeamId,
        predDecidedIn: slot.predDecidedIn,
      }
    }
  }
  return map
}
