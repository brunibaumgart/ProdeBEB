'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

import {
  MATCHDAY_DRAW_SCORING_NOTICE_PATH,
  MATCHDAY_DRAW_SCORING_NOTICE_TAG,
} from '@/lib/announcements/matchday-draw-scoring'
import { deliverPushPayload } from '@/lib/push/delivery'
import { getPushNotificationIcon, PIO_PUSH_ICON } from '@/lib/push/icons'
import { canReceiveSurprisePush } from '@/lib/push/preferences'
import { prisma } from '@/lib/prisma'
import { requireDbUserForAction } from '@/lib/queries/users'
import { recalculateAllFinishedMatchdayPoints } from '@/lib/tournament/recalculate-matchday'

export type AnnouncementActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string }

function revalidateAnnouncementPaths() {
  revalidatePath('/', 'layout')
  revalidatePath('/prode')
  revalidatePath('/admin')
}

export async function dismissMatchdayDrawScoringNotice(): Promise<AnnouncementActionResult> {
  const authResult = await requireDbUserForAction()
  if (!authResult.ok) return authResult

  await prisma.user.update({
    where: { id: authResult.user.id },
    data: { matchdayDrawScoringNoticeSeenAt: new Date() },
  })

  revalidateAnnouncementPaths()

  return { ok: true, message: 'Aviso cerrado.' }
}

export async function adminRecalculateMatchdayDrawScoring(): Promise<AnnouncementActionResult> {
  const { userId } = await auth()
  if (!userId || userId !== process.env.ADMIN_USER_ID) {
    return { ok: false, error: 'No autorizado.' }
  }

  const result = await recalculateAllFinishedMatchdayPoints()

  revalidateAnnouncementPaths()

  return {
    ok: true,
    message: `Recálculo listo: ${result.predictionsUpdated} predicción${result.predictionsUpdated === 1 ? '' : 'es'} actualizada${result.predictionsUpdated === 1 ? '' : 's'} en ${result.matchesProcessed} partido${result.matchesProcessed === 1 ? '' : 's'} (${result.usersSynced} usuario${result.usersSynced === 1 ? '' : 's'}).`,
  }
}

export async function adminSendMatchdayDrawScoringNoticePush(): Promise<AnnouncementActionResult> {
  const { userId } = await auth()
  if (!userId || userId !== process.env.ADMIN_USER_ID) {
    return { ok: false, error: 'No autorizado.' }
  }

  const recipients = await prisma.user.findMany({
    where: { pushSubscriptions: { some: {} } },
    include: { pushSubscriptions: true },
  })

  if (recipients.length === 0) {
    return { ok: false, error: 'No hay usuarios con push activo.' }
  }

  let sent = 0
  let failed = 0

  for (const user of recipients) {
    const payload = {
      title: 'Ajuste en puntos de Fecha a Fecha',
      body: 'Corregimos el puntaje de empates. Tocá para ver el detalle y tus puntos actualizados.',
      url: MATCHDAY_DRAW_SCORING_NOTICE_PATH,
      icon: getPushNotificationIcon({ name: user.name }),
      tag: MATCHDAY_DRAW_SCORING_NOTICE_TAG,
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
    message: `Aviso enviado a ${recipients.length} usuario${recipients.length === 1 ? '' : 's'} (${sent} dispositivo${sent === 1 ? '' : 's'})${suffix}.`,
  }
}

export async function adminSendPenaltiesWinnerNoticePush(): Promise<AnnouncementActionResult> {
  const { userId } = await auth()
  if (!userId || userId !== process.env.ADMIN_USER_ID) {
    return { ok: false, error: 'No autorizado.' }
  }

  const recipients = await prisma.user.findMany({
    where: {
      pushRemindersEnabled: true,
      pushSubscriptions: { some: {} },
    },
    include: { pushSubscriptions: true },
  })

  if (recipients.length === 0) {
    return { ok: false, error: 'No hay usuarios con recordatorio 11:00 activo.' }
  }

  let sent = 0
  let failed = 0

  for (const user of recipients) {
    const isSpecial = canReceiveSurprisePush({
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      clerkId: user.clerkId,
    })

    const payload = isSpecial
      ? {
          title: 'Un pedido especialmente para vos 🐤',
          body: 'Entra a marcar el ganador de las tandas de penales',
          url: '/prode/fecha',
          icon: PIO_PUSH_ICON,
          tag: 'penalties-winner-notice',
        }
      : {
          title: '¡Nueva opción en Fecha a Fecha!',
          body: 'Ahora podés elegir quién avanza por penales en los duelos eliminatorios y sumar 2 puntos extra.',
          url: '/prode/fecha',
          icon: getPushNotificationIcon({ name: user.name }),
          tag: 'penalties-winner-notice',
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
    message: `Push de penales enviado a ${recipients.length} usuario${recipients.length === 1 ? '' : 's'} (${sent} dispositivo${sent === 1 ? '' : 's'})${suffix}.`,
  }
}

export async function adminSendFinalistNoticePush(): Promise<AnnouncementActionResult> {
  const { userId } = await auth()
  if (!userId || userId !== process.env.ADMIN_USER_ID) {
    return { ok: false, error: 'No autorizado.' }
  }

  const recipients = await prisma.user.findMany({
    where: { pushSubscriptions: { some: {} } },
    include: { pushSubscriptions: true },
  })

  if (recipients.length === 0) {
    return { ok: false, error: 'No hay usuarios con push activo.' }
  }

  let sent = 0
  let failed = 0

  for (const user of recipients) {
    const payload = {
      title: 'SOMOS FINALISTAS DEL MUNDO! 🇦🇷',
      body: 'Argentina 2-1 Inglaterra. ¡Nos vemos en la final!',
      url: '/prode/fecha',
      icon: getPushNotificationIcon({ name: user.name }),
      tag: 'argentina-finalista',
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
    message: `Aviso enviado a ${recipients.length} usuario${recipients.length === 1 ? '' : 's'} (${sent} dispositivo${sent === 1 ? '' : 's'})${suffix}.`,
  }
}

const PIO_RESULT_CORRECTION_MATCH_ID = 90

export async function adminSendPioResultCorrectionPush(): Promise<AnnouncementActionResult> {
  const { userId } = await auth()
  if (!userId || userId !== process.env.ADMIN_USER_ID) {
    return { ok: false, error: 'No autorizado.' }
  }

  const user = await prisma.user.findFirst({
    where: { name: { equals: 'pio', mode: 'insensitive' } },
    include: { pushSubscriptions: true },
  })
  if (!user) return { ok: false, error: 'Usuario pio no encontrado.' }
  if (user.pushSubscriptions.length === 0) {
    return { ok: false, error: 'pio no tiene notificaciones push activas.' }
  }

  const match = await prisma.match.findUnique({
    where: { id: PIO_RESULT_CORRECTION_MATCH_ID },
    include: { homeTeam: true, awayTeam: true },
  })
  if (!match) return { ok: false, error: 'Partido no encontrado.' }

  const prediction = await prisma.prediction.findUnique({
    where: { userId_matchId: { userId: user.id, matchId: PIO_RESULT_CORRECTION_MATCH_ID } },
  })
  if (!prediction) return { ok: false, error: 'pio no tiene predicción cargada para este partido.' }

  const homeFlag = match.homeTeam?.flagEmoji ?? '⚽'
  const awayFlag = match.awayTeam?.flagEmoji ?? '⚽'
  const points = prediction.points ?? 0

  const payload = {
    title: `${homeFlag} vs ${awayFlag} · Resultado corregido`,
    body: `Arreglamos tu predicción a ${prediction.predHome}-${prediction.predAway}. Ahora sumás +${points} pt 🎉`,
    url: `/fixture/${PIO_RESULT_CORRECTION_MATCH_ID}`,
    icon: getPushNotificationIcon({ name: user.name }),
    tag: `prediction-corrected-${PIO_RESULT_CORRECTION_MATCH_ID}`,
  }

  const { sent, failed } = await deliverPushPayload(user.pushSubscriptions, payload, {
    userId: user.id,
  })

  if (sent === 0) {
    return { ok: false, error: 'No se pudo enviar a ningún dispositivo.' }
  }

  const suffix = failed > 0 ? ` (${failed} falló)` : ''
  return {
    ok: true,
    message: `Push enviado a pio (${sent} dispositivo${sent === 1 ? '' : 's'})${suffix}.`,
  }
}
