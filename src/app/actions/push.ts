'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

import { deliverPushPayload } from '@/lib/push/delivery'
import { getPushNotificationIcon } from '@/lib/push/icons'
import { prisma } from '@/lib/prisma'
import { ensureDbUser, requireDbUserForAction } from '@/lib/queries/users'

export type PushActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string }

export async function dismissPushReminderPrompt(): Promise<PushActionResult> {
  const authResult = await requireDbUserForAction()
  if (!authResult.ok) return authResult

  await prisma.user.update({
    where: { id: authResult.user.id },
    data: { pushReminderPromptSeenAt: new Date() },
  })

  revalidatePath('/perfil')
  revalidatePath('/', 'layout')

  return { ok: true, message: 'Podés activar el recordatorio desde tu perfil cuando quieras.' }
}

export async function setPushRemindersEnabled(enabled: boolean): Promise<PushActionResult> {
  const authResult = await requireDbUserForAction()
  if (!authResult.ok) return authResult

  await prisma.user.update({
    where: { id: authResult.user.id },
    data: {
      pushRemindersEnabled: enabled,
      pushReminderPromptSeenAt: new Date(),
    },
  })

  revalidatePath('/perfil')
  revalidatePath('/', 'layout')

  return {
    ok: true,
    message: enabled
      ? 'Recordatorio de las 11:00 activado.'
      : 'Recordatorio de las 11:00 desactivado.',
  }
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
      error: 'No tenés suscripciones push. Activá el recordatorio en /perfil primero.',
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
