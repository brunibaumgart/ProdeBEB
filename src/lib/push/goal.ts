import { matchWithRelations, type MatchWithRelations } from '@/lib/queries/matches'
import { getKickoffPushRecipients } from '@/lib/push/admin-recipients'
import { deliverPushPayload } from '@/lib/push/delivery'
import type { GoalEvent } from '@/lib/push/goal-events'
import { getPushNotificationIcon } from '@/lib/push/icons'
import { buildGoalNotificationCopy } from '@/lib/push/match-copy'
import type { PushPayload } from '@/lib/push/web-push-server'
import { formatScorerSlotLabel, isOwnGoalSentinel } from '@/lib/scoring/scorers'

function buildGoalPayload(
  match: Pick<MatchWithRelations, 'id' | 'homeTeam' | 'awayTeam'>,
  event: GoalEvent,
  homeScore: number,
  awayScore: number,
  playerName?: string | null,
  goalIndex = 0,
): PushPayload {
  const scorerLabel =
    event.scorerId != null
      ? formatScorerSlotLabel(event.scorerId, playerName)
      : 'Gol!'

  const { title, body } = buildGoalNotificationCopy(
    match,
    { isHome: event.isHome, scorerLabel },
    homeScore,
    awayScore,
  )

  return {
    title,
    body,
    url: `/fixture/${match.id}`,
    tag: `goal-${match.id}-${homeScore}-${awayScore}-${goalIndex}`,
  }
}

export async function sendGoalPushNotifications(
  match: MatchWithRelations,
  events: GoalEvent[],
  homeScore: number,
  awayScore: number,
): Promise<{ sent: number; failed: number; goals: number }> {
  if (events.length === 0 || match.isTest) {
    return { sent: 0, failed: 0, goals: 0 }
  }

  const playerIds = [
    ...new Set(
      events
        .map((event) => event.scorerId)
        .filter((id): id is string => id != null && !isOwnGoalSentinel(id)),
    ),
  ]

  const { prisma } = await import('@/lib/prisma')
  const players =
    playerIds.length > 0
      ? await prisma.player.findMany({
          where: { id: { in: playerIds } },
          select: { id: true, name: true },
        })
      : []
  const playerNameById = new Map(players.map((player) => [player.id, player.name]))

  const recipients = await getKickoffPushRecipients()
  let sent = 0
  let failed = 0

  for (const [index, event] of events.entries()) {
    const playerName =
      event.scorerId && !isOwnGoalSentinel(event.scorerId)
        ? playerNameById.get(event.scorerId)
        : null

    const basePayload = buildGoalPayload(match, event, homeScore, awayScore, playerName, index)

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
  }

  return { sent, failed, goals: events.length }
}

export async function sendGoalPushForMatchId(
  matchId: number,
  events: GoalEvent[],
  homeScore: number,
  awayScore: number,
) {
  const { prisma } = await import('@/lib/prisma')

  const match = await prisma.match.findFirst({
    where: { id: matchId, isTest: false },
    include: matchWithRelations,
  })

  if (!match) {
    return { sent: 0, failed: 0, goals: 0, skipped: true as const }
  }

  const result = await sendGoalPushNotifications(match, events, homeScore, awayScore)
  return { ...result, skipped: false as const }
}
