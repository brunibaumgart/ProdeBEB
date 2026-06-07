import 'server-only'

import { isPlatformAdmin } from '@/lib/auth/test-access'
import { prisma } from '@/lib/prisma'
import { buildTournamentQuotaStatus } from '@/lib/tournament/quota-logic'

export {
  GLOBAL_TOURNAMENT_CODE,
  FREE_TOURNAMENT_CREATE_LIMIT,
  FREE_TOURNAMENT_JOIN_LIMIT,
  PAID_CREATE_PRICE_ARS,
  PAID_JOIN_PRICE_ARS,
  buildTournamentQuotaStatus,
  quotaCreateBlockedMessage,
  quotaJoinBlockedMessage,
} from '@/lib/tournament/quota-logic'

export type { TournamentQuotaStatus } from '@/lib/tournament/quota-logic'

export type TournamentQuotaUser = {
  id: string
  clerkId: string
  isAdmin: boolean
}

export async function countPrivateTournamentsCreated(userId: string): Promise<number> {
  return prisma.tournament.count({
    where: {
      createdById: userId,
      code: { not: 'GLOBAL' },
    },
  })
}

export async function countPrivateTournamentJoins(userId: string): Promise<number> {
  return prisma.tournamentMember.count({
    where: {
      userId,
      tournament: {
        code: { not: 'GLOBAL' },
        NOT: { createdById: userId },
      },
    },
  })
}

export async function getTournamentQuotaStatus(user: TournamentQuotaUser) {
  const isUnlimited = isPlatformAdmin(user)
  const [createsUsed, joinsUsed] = await Promise.all([
    countPrivateTournamentsCreated(user.id),
    countPrivateTournamentJoins(user.id),
  ])

  return buildTournamentQuotaStatus(createsUsed, joinsUsed, isUnlimited)
}
