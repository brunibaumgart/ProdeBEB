import { PREDICTION_LOCK_MINUTES } from '@/lib/matches/availability'
import { getUserPredictionsForMatchIds } from '@/lib/queries/predictions'
import { getTodayMatches, type MatchWithRelations } from '@/lib/queries/matches'
import { pushReminderUserFilter } from '@/lib/push/config'
import type { PushPayload } from '@/lib/push/web-push-server'
import { isDbMatchLocked, getArgentinaTodayBounds } from '@/lib/time'

function formatMatchLine(match: MatchWithRelations): string {
  const home = match.homeTeam?.nameEs ?? 'Local'
  const away = match.awayTeam?.nameEs ?? 'Visitante'
  const timeArg = match.timeArg ?? ''
  return `${home} vs ${away}${timeArg ? ` · ${timeArg}` : ''}`
}

export function buildDailyReminderPayload(
  matches: MatchWithRelations[],
  options?: { pendingCount?: number },
): PushPayload | null {
  if (matches.length === 0) return null

  const lines = matches.slice(0, 3).map(formatMatchLine)
  const remaining = matches.length - lines.length
  const pendingSuffix =
    options?.pendingCount != null && options.pendingCount > 0
      ? ` · Te faltan ${options.pendingCount}`
      : ''

  const body =
    remaining > 0
      ? `${lines.join(' · ')} · y ${remaining} más${pendingSuffix}`
      : `${lines.join(' · ')}${pendingSuffix}`

  return {
    title:
      matches.length === 1
        ? 'ProdeBEB — 1 partido hoy'
        : `ProdeBEB — ${matches.length} partidos hoy`,
    body,
    url: '/prode/fecha',
  }
}

export async function getDailyReminderPayloadForUser(userId: string): Promise<PushPayload | null> {
  const { gte, lte } = getArgentinaTodayBounds()
  const todayMatches = await getTodayMatches(gte, lte)

  const openMatches = todayMatches.filter(
    (match) =>
      match.status === 'scheduled' &&
      match.homeTeamId &&
      match.awayTeamId &&
      !isDbMatchLocked(match, PREDICTION_LOCK_MINUTES),
  )

  if (openMatches.length === 0) return null

  const predictions = await getUserPredictionsForMatchIds(
    userId,
    openMatches.map((match) => match.id),
  )

  const pendingMatches = openMatches.filter((match) => !predictions.has(match.id))
  if (pendingMatches.length === 0) return null

  return buildDailyReminderPayload(pendingMatches, {
    pendingCount: pendingMatches.length,
  })
}

export async function sendDailyPushReminders() {
  const { prisma } = await import('@/lib/prisma')
  const { sendPushNotification } = await import('@/lib/push/web-push-server')

  const users = await prisma.user.findMany({
    where: {
      pushRemindersEnabled: true,
      pushSubscriptions: { some: {} },
      ...pushReminderUserFilter(),
    },
    include: { pushSubscriptions: true },
  })

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const user of users) {
    const payload = await getDailyReminderPayloadForUser(user.id)
    if (!payload) {
      skipped += 1
      continue
    }

    for (const subscription of user.pushSubscriptions) {
      try {
        await sendPushNotification(subscription, payload)
        sent += 1
      } catch (error) {
        failed += 1
        const statusCode =
          error && typeof error === 'object' && 'statusCode' in error
            ? Number(error.statusCode)
            : null

        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {})
        }

        console.error('Push send failed', {
          userId: user.id,
          subscriptionId: subscription.id,
          statusCode,
          error,
        })
      }
    }
  }

  return { sent, failed, skipped, users: users.length }
}
