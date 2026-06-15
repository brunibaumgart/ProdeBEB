import { PREDICTION_LOCK_MINUTES } from '@/lib/matches/availability'
import { getUserPredictionsForMatchIds } from '@/lib/queries/predictions'
import { getTodayMatches, type MatchWithRelations } from '@/lib/queries/matches'
import { deliverPushPayload } from '@/lib/push/delivery'
import { getPushNotificationIcon } from '@/lib/push/icons'
import { formatMatchFlagsLine } from '@/lib/push/match-copy'
import type { PushPayload } from '@/lib/push/web-push-server'
import { isDbMatchLocked, getArgentinaTodayBounds } from '@/lib/time'

export function buildDailyReminderPayload(
  matches: MatchWithRelations[],
  options?: { pendingCount?: number },
): PushPayload | null {
  if (matches.length === 0) return null

  const lines = matches.slice(0, 3).map(formatMatchFlagsLine)
  const remaining = matches.length - lines.length
  const pendingCount = options?.pendingCount ?? matches.length

  const body =
    remaining > 0
      ? `${lines.join(' · ')} · y ${remaining} más`
      : lines.join(' · ')

  const title =
    pendingCount === 1
      ? 'Te falta 1 predicción hoy'
      : `Te faltan ${pendingCount} predicciones hoy`

  return {
    title,
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
  const { getReminderPushRecipients } = await import('@/lib/push/admin-recipients')

  const users = await getReminderPushRecipients()

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
