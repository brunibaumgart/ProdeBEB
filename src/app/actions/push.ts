'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

import { deliverPushPayload } from '@/lib/push/delivery'
import { getPushNotificationIcon } from '@/lib/push/icons'
import {
  canReceiveSurprisePush,
  shouldShowSurprisePushOption,
  type PushPreferences,
} from '@/lib/push/preferences'
import { isPioProfile } from '@/lib/personal/pio-countdown'
import { prisma } from '@/lib/prisma'
import { ensureDbUser, requireDbUserForAction } from '@/lib/queries/users'

export type PushActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string }

export interface PushPreferencesInput {
  reminders: boolean
  kickoff: boolean
  surprise: boolean
}

function revalidatePushPaths() {
  revalidatePath('/perfil')
  revalidatePath('/', 'layout')
}

function sanitizePreferences(
  user: {
    name: string
    email: string
    isAdmin: boolean
    clerkId: string
    pushSurpriseEnabled: boolean
  },
  input: PushPreferencesInput,
): PushPreferences {
  const eligibleForSurprise = canReceiveSurprisePush(user)
  const preserveSurpriseFromDb = isPioProfile(user)

  return {
    pushRemindersEnabled: input.reminders,
    pushKickoffEnabled: input.kickoff,
    pushSurpriseEnabled: eligibleForSurprise
      ? preserveSurpriseFromDb
        ? user.pushSurpriseEnabled
        : input.surprise
      : false,
  }
}

export async function dismissPushSetupPrompt(): Promise<PushActionResult> {
  const authResult = await requireDbUserForAction()
  if (!authResult.ok) return authResult

  await prisma.user.update({
    where: { id: authResult.user.id },
    data: {
      pushSetupPromptSeenAt: new Date(),
      pushReminderPromptSeenAt: new Date(),
    },
  })

  revalidatePushPaths()

  return { ok: true, message: 'Podés configurar notificaciones desde tu perfil cuando quieras.' }
}

/** @deprecated Usar dismissPushSetupPrompt */
export async function dismissPushReminderPrompt(): Promise<PushActionResult> {
  return dismissPushSetupPrompt()
}

export async function updatePushPreferences(
  input: PushPreferencesInput,
): Promise<PushActionResult> {
  const authResult = await requireDbUserForAction()
  if (!authResult.ok) return authResult

  const preferences = sanitizePreferences(authResult.user, input)

  await prisma.user.update({
    where: { id: authResult.user.id },
    data: {
      ...preferences,
      pushSetupPromptSeenAt: new Date(),
      pushReminderPromptSeenAt: new Date(),
    },
  })

  revalidatePushPaths()

  const activeLabels = [
    preferences.pushRemindersEnabled && 'recordatorio 11:00',
    preferences.pushKickoffEnabled && 'arranque de partidos',
    preferences.pushSurpriseEnabled &&
      shouldShowSurprisePushOption(authResult.user) &&
      'sorpresas',
  ].filter(Boolean)

  return {
    ok: true,
    message:
      activeLabels.length > 0
        ? `Preferencias guardadas: ${activeLabels.join(', ')}.`
        : 'Notificaciones desactivadas.',
  }
}

export async function setPushRemindersEnabled(enabled: boolean): Promise<PushActionResult> {
  const authResult = await requireDbUserForAction()
  if (!authResult.ok) return authResult

  const user = authResult.user

  return updatePushPreferences({
    reminders: enabled,
    kickoff: user.pushKickoffEnabled,
    surprise: user.pushSurpriseEnabled,
  })
}

export async function sendAdminTestPushNotification(): Promise<PushActionResult> {
  const { userId } = await auth()
  if (!userId || userId !== process.env.ADMIN_USER_ID) {
    return { ok: false, error: 'No autorizado.' }
  }

  const dbUser = await ensureDbUser()
  if (!dbUser) {
    return { ok: false, error: 'Usuario no encontrado.' }
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: dbUser.id },
  })

  if (subscriptions.length === 0) {
    return {
      ok: false,
      error: 'No tenés suscripciones push. Activá notificaciones en /perfil primero.',
    }
  }

  const { getDailyReminderPayloadForUser } = await import('@/lib/push/daily-reminder')

  const basePayload =
    (await getDailyReminderPayloadForUser(dbUser.id)) ?? {
      title: 'Notificación de prueba',
      body: 'Si ves esto, las push funcionan correctamente.',
      url: '/prode/fecha',
    }

  const payload = {
    ...basePayload,
    icon: getPushNotificationIcon({ name: dbUser.name }),
  }

  const { sent, failed } = await deliverPushPayload(subscriptions, payload, { userId: dbUser.id })

  if (sent === 0) {
    return {
      ok: false,
      error: 'No se pudo enviar a ningún dispositivo. Revisá que la PWA esté instalada y el permiso activo.',
    }
  }

  const suffix = failed > 0 ? ` (${failed} falló)` : ''
  return {
    ok: true,
    message: `Notificación enviada a ${sent} dispositivo${sent === 1 ? '' : 's'}${suffix}.`,
  }
}

export async function sendOsitoSurpriseMessage(message: string): Promise<PushActionResult> {
  const authResult = await requireDbUserForAction()
  if (!authResult.ok) return authResult

  if (!isPioProfile(authResult.user)) {
    return { ok: false, error: 'No autorizado.' }
  }

  const body = message.trim()
  if (!body) {
    return { ok: false, error: 'Escribí un mensajito para osito.' }
  }
  if (body.length > 240) {
    return { ok: false, error: 'El mensaje puede tener hasta 240 caracteres.' }
  }

  const { getOsitoSurprisePushRecipients } = await import('@/lib/push/admin-recipients')
  const recipients = await getOsitoSurprisePushRecipients()

  if (recipients.length === 0) {
    return {
      ok: false,
      error: 'Nadie tiene push activo todavía. Osito tiene que activar notificaciones en su perfil.',
    }
  }

  let sent = 0
  let failed = 0

  for (const user of recipients) {
    const payload = {
      title: 'Para osito 🐻',
      body,
      url: '/perfil',
      icon: getPushNotificationIcon({ name: user.name }),
      tag: 'prodebeb-osito-surprise',
    }
    const result = await deliverPushPayload(user.pushSubscriptions, payload, { userId: user.id })
    sent += result.sent
    failed += result.failed
  }

  if (sent === 0) {
    return { ok: false, error: 'No se pudo enviar a ningún dispositivo.' }
  }

  const names = recipients.map((user) => user.name).join(' y ')
  const suffix = failed > 0 ? ` (${failed} falló)` : ''

  return {
    ok: true,
    message: `Sorpresa enviada a ${names} (${sent} dispositivo${sent === 1 ? '' : 's'})${suffix}.`,
  }
}

export async function sendSurprisePushNotification(
  title: string,
  body: string,
  url = '/prode',
): Promise<PushActionResult> {
  const { userId } = await auth()
  if (!userId || userId !== process.env.ADMIN_USER_ID) {
    return { ok: false, error: 'No autorizado.' }
  }

  const { getSurprisePushRecipients } = await import('@/lib/push/admin-recipients')

  const recipients = await getSurprisePushRecipients()
  if (recipients.length === 0) {
    return { ok: false, error: 'Nadie tiene sorpresas activadas con push suscripto.' }
  }

  let sent = 0
  let failed = 0

  for (const user of recipients) {
    const payload = {
      title,
      body,
      url,
      icon: getPushNotificationIcon({ name: user.name }),
      tag: 'prodebeb-surprise',
    }
    const result = await deliverPushPayload(user.pushSubscriptions, payload, { userId: user.id })
    sent += result.sent
    failed += result.failed
  }

  if (sent === 0) {
    return { ok: false, error: 'No se pudo enviar a ningún dispositivo.' }
  }

  const suffix = failed > 0 ? ` (${failed} falló)` : ''
  return {
    ok: true,
    message: `Sorpresa enviada a ${recipients.length} usuario${recipients.length === 1 ? '' : 's'} (${sent} dispositivo${sent === 1 ? '' : 's'})${suffix}.`,
  }
}
