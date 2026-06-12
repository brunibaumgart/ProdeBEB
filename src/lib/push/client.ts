'use client'

export interface PushSubscribePreferences {
  reminders: boolean
  kickoff: boolean
  surprise: boolean
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

export async function registerPushServiceWorker() {
  if (!isPushSupported()) return null
  return navigator.serviceWorker.register('/sw.js', { scope: '/' })
}

export async function getPushServiceWorkerRegistration() {
  if (!isPushSupported()) return null

  const existing = await navigator.serviceWorker.getRegistration('/')
  if (existing) return existing

  return registerPushServiceWorker()
}

async function fetchVapidPublicKey() {
  const response = await fetch('/api/push/vapid-public-key')
  if (!response.ok) {
    throw new Error('No se pudo obtener la clave de notificaciones.')
  }

  const data = (await response.json()) as { publicKey?: string }
  if (!data.publicKey) {
    throw new Error('La clave de notificaciones no está configurada.')
  }

  return data.publicKey
}

export async function subscribeToPushNotifications(preferences?: PushSubscribePreferences) {
  if (!isPushSupported()) {
    throw new Error('Tu navegador no soporta notificaciones push.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Necesitamos permiso para enviarte notificaciones.')
  }

  const registration = await getPushServiceWorkerRegistration()
  if (!registration) {
    throw new Error('No se pudo registrar el service worker.')
  }

  await navigator.serviceWorker.ready

  const publicKey = await fetchVapidPublicKey()
  const existing = await registration.pushManager.getSubscription()

  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))

  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...subscription.toJSON(),
      preferences: preferences ?? {
        reminders: true,
        kickoff: false,
        surprise: false,
      },
    }),
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error ?? 'No se pudo guardar la suscripción.')
  }

  return subscription
}

export async function unsubscribeFromPushNotifications() {
  if (!isPushSupported()) return

  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()

  if (!subscription) return

  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  })

  await subscription.unsubscribe()
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}
