import webpush from 'web-push'

import { getSiteUrl } from '@/lib/site-url'

const VAPID_SUBJECT = 'mailto:soporte@prodebeb.com'

function getVapidPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY
  if (!key) {
    throw new Error('Missing VAPID_PUBLIC_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY')
  }
  return key
}

function getVapidPrivateKey(): string {
  const key = process.env.VAPID_PRIVATE_KEY
  if (!key) {
    throw new Error('Missing VAPID_PRIVATE_KEY')
  }
  return key
}

let configured = false

export function configureWebPush() {
  if (configured) return

  webpush.setVapidDetails(VAPID_SUBJECT, getVapidPublicKey(), getVapidPrivateKey())
  configured = true
}

export function getPublicVapidKey() {
  return getVapidPublicKey()
}

export interface PushPayload {
  title: string
  body: string
  url: string
  icon?: string
  tag?: string
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
) {
  configureWebPush()

  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify(payload),
  )
}

export function getDefaultPushUrl() {
  return `${getSiteUrl()}/prode/fecha`
}
