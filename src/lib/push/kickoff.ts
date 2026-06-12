import { revalidatePath, revalidateTag } from 'next/cache'

import { matchWithRelations, type MatchWithRelations } from '@/lib/queries/matches'
import { getAdminUsersWithPushSubscriptions } from '@/lib/push/admin-recipients'
import { deliverPushPayload } from '@/lib/push/delivery'
import { getPushNotificationIcon } from '@/lib/push/icons'
import type { PushPayload } from '@/lib/push/web-push-server'

/** Partidos cuyo kick-off ya pasó pero el cron no corrió a tiempo (máx. 6 h de atraso). */
export const KICKOFF_MAX_BACKLOG_MS = 6 * 60 * 60 * 1000

export function buildKickoffPayload(match: MatchWithRelations): PushPayload {
  const home = match.homeTeam?.nameEs ?? match.homeLabel ?? 'Local'
  const away = match.awayTeam?.nameEs ?? match.awayLabel ?? 'Visitante'
  const timeArg = match.timeArg ? ` · ${match.timeArg}` : ''

  return {
    title: 'ProdeBEB — Arrancó el partido',
    body: `${home} vs ${away}${timeArg}`,
    url: `/fixture/${match.id}`,
  }
}

function revalidateMatchPaths() {
  revalidatePath('/')
  revalidatePath('/fixture')
  revalidatePath('/grupos')
  revalidateTag('standings', 'max')
  revalidatePath('/prode')
  revalidatePath('/prode/fecha')
  revalidatePath('/perfil')
  revalidatePath('/prode/completo')
  revalidatePath('/admin')
  revalidatePath('/torneos', 'layout')
}

async function processKickoffForMatches(matches: MatchWithRelations[]) {
  const { prisma } = await import('@/lib/prisma')
  const admins = await getAdminUsersWithPushSubscriptions()
  let sent = 0
  let failed = 0
  let markedLive = 0

  for (const match of matches) {
    await prisma.match.update({
      where: { id: match.id },
      data: {
        status: 'live',
        kickoffPushNotifiedAt: new Date(),
      },
    })
    markedLive += 1

    const basePayload = buildKickoffPayload(match)

    for (const admin of admins) {
      const payload: PushPayload = {
        ...basePayload,
        icon: getPushNotificationIcon({ name: admin.name }),
      }
      const result = await deliverPushPayload(admin.pushSubscriptions, payload, {
        userId: admin.id,
      })
      sent += result.sent
      failed += result.failed
    }
  }

  if (markedLive > 0) {
    revalidateMatchPaths()
  }

  return { sent, failed, markedLive, admins: admins.length }
}

const kickoffMatchInclude = matchWithRelations

const kickoffMatchBaseWhere = {
  isTest: false,
  kickoffPushNotifiedAt: null,
  homeTeamId: { not: null },
  awayTeamId: { not: null },
} as const

/** Marca en vivo y envía push (manual desde admin o cron). */
export async function sendKickoffPushForMatch(matchId: number) {
  const { prisma } = await import('@/lib/prisma')

  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      status: { in: ['scheduled', 'live'] },
      ...kickoffMatchBaseWhere,
    },
    include: kickoffMatchInclude,
  })

  if (!match) {
    return { sent: 0, failed: 0, markedLive: 0, skipped: true as const }
  }

  const result = await processKickoffForMatches([match])
  return { ...result, skipped: false as const }
}

/** Cron: partidos programados cuya hora de kick-off ya pasó → en vivo + push al admin. */
export async function sendMatchKickoffPushNotifications() {
  const { prisma } = await import('@/lib/prisma')

  const now = Date.now()
  const backlogStart = new Date(now - KICKOFF_MAX_BACKLOG_MS)
  const admins = await getAdminUsersWithPushSubscriptions()

  const matches = await prisma.match.findMany({
    where: {
      status: 'scheduled',
      ...kickoffMatchBaseWhere,
      date: {
        lte: new Date(now),
        gte: backlogStart,
      },
    },
    include: kickoffMatchInclude,
    orderBy: { date: 'asc' },
  })

  if (matches.length === 0) {
    return { sent: 0, failed: 0, markedLive: 0, matches: 0, admins: admins.length }
  }

  const result = await processKickoffForMatches(matches)
  return {
    sent: result.sent,
    failed: result.failed,
    markedLive: result.markedLive,
    matches: matches.length,
    admins: result.admins,
  }
}
