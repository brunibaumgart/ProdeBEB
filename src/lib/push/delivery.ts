import { prisma } from '@/lib/prisma'
import type { PushPayload } from '@/lib/push/web-push-server'
import { sendPushNotification } from '@/lib/push/web-push-server'

type PushSubscriptionRow = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

export async function deliverPushPayload(
  subscriptions: PushSubscriptionRow[],
  payload: PushPayload,
  context?: { userId?: string },
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  for (const subscription of subscriptions) {
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
        userId: context?.userId,
        subscriptionId: subscription.id,
        statusCode,
        error,
      })
    }
  }

  return { sent, failed }
}
