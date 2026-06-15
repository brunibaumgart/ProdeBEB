import { matchWithRelations, type MatchWithRelations } from '@/lib/queries/matches'
import { getReminderPushRecipients } from '@/lib/push/admin-recipients'
import { deliverPushPayload } from '@/lib/push/delivery'
import { getPushNotificationIcon } from '@/lib/push/icons'
import { buildMatchFinishedNotificationCopy } from '@/lib/push/match-copy'
import type { PushPayload } from '@/lib/push/web-push-server'

function buildMatchFinishedPayload(
  match: Pick<MatchWithRelations, 'id' | 'homeTeam' | 'awayTeam'>,
  homeScore: number,
  awayScore: number,
): PushPayload {
  const { title, body } = buildMatchFinishedNotificationCopy(match, homeScore, awayScore)

  return {
    title,
    body,
    url: `/fixture/${match.id}`,
    tag: `finished-${match.id}`,
  }
}

export async function sendMatchFinishedPushNotifications(
  match: MatchWithRelations,
  homeScore: number,
  awayScore: number,
): Promise<{ sent: number; failed: number }> {
  if (match.isTest) {
    return { sent: 0, failed: 0 }
  }

  const recipients = await getReminderPushRecipients()
  const basePayload = buildMatchFinishedPayload(match, homeScore, awayScore)
  let sent = 0
  let failed = 0

  for (const recipient of recipients) {
    const payload: PushPayload = {
      ...basePayload,
      icon: getPushNotificationIcon({ name: recipient.name }),
    }
    const result = await deliverPushPayload(recipient.pushSubscriptions, payload, {
      userId: recipient.id,
    })
    sent += result.sent
    failed += result.failed
  }

  return { sent, failed }
}

export async function sendMatchFinishedPushForMatchId(
  matchId: number,
  homeScore: number,
  awayScore: number,
) {
  const { prisma } = await import('@/lib/prisma')

  const match = await prisma.match.findFirst({
    where: { id: matchId, isTest: false },
    include: matchWithRelations,
  })

  if (!match) {
    return { sent: 0, failed: 0, skipped: true as const }
  }

  const result = await sendMatchFinishedPushNotifications(match, homeScore, awayScore)
  return { ...result, skipped: false as const }
}
