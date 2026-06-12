import { PREDICTION_LOCK_MINUTES } from '@/lib/matches/availability'
import { getUserPredictionsForMatchIds } from '@/lib/queries/predictions'
import { getTodayMatches, type MatchWithRelations } from '@/lib/queries/matches'
import { deliverPushPayload } from '@/lib/push/delivery'
import { getPushNotificationIcon } from '@/lib/push/icons'
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
        ? 'ProdeBEB — 1 partido hoy (Fecha a Fecha)'
        : `ProdeBEB — ${matches.length} partidos hoy (Fecha a Fecha)`,
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

  const users = await prisma.user.findMany({
    where: {
      pushRemindersEnabled: true,
      pushSubscriptions: { some: {} },
    },
    include: { pushSubscriptions: true },
  })

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const user of users) {
    const basePayload = await getDailyReminderPayloadForUser(user.id)
    if (!basePayload) {
      skipped += 1
      continue
    }

    const payload: PushPayload = {
      ...basePayload,
      icon: getPushNotificationIcon({ name: user.name }),
    }

    const result = await deliverPushPayload(user.pushSubscriptions, payload, { userId: user.id })
    sent += result.sent
    failed += result.failed
  }

  return { sent, failed, skipped, users: users.length }
}
