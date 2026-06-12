import { matchWithRelations, type MatchWithRelations } from '@/lib/queries/matches'
import { getAdminUsersWithPushSubscriptions } from '@/lib/push/admin-recipients'
import { deliverPushPayload } from '@/lib/push/delivery'
import { getPushNotificationIcon } from '@/lib/push/icons'
import type { PushPayload } from '@/lib/push/web-push-server'

/** Ventana de detección: debe ser mayor al intervalo del cron (5 min). */
const KICKOFF_CRON_WINDOW_MS = 6 * 60 * 1000

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

export async function sendMatchKickoffPushNotifications() {
  const { prisma } = await import('@/lib/prisma')

  const now = Date.now()
  const windowStart = new Date(now - KICKOFF_CRON_WINDOW_MS)

  const matches = await prisma.match.findMany({
    where: {
      status: 'scheduled',
      isTest: false,
      kickoffPushNotifiedAt: null,
      homeTeamId: { not: null },
      awayTeamId: { not: null },
      date: {
        lte: new Date(now),
        gte: windowStart,
      },
    },
    include: matchWithRelations,
    orderBy: { date: 'asc' },
  })

  if (matches.length === 0) {
    return { sent: 0, failed: 0, matches: 0, admins: 0 }
  }

  const admins = await getAdminUsersWithPushSubscriptions()
  let sent = 0
  let failed = 0

  for (const match of matches) {
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

    await prisma.match.update({
      where: { id: match.id },
      data: { kickoffPushNotifiedAt: new Date() },
    })
  }

  return { sent, failed, matches: matches.length, admins: admins.length }
}
