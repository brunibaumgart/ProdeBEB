'use server'

import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { prisma } from '@/lib/prisma'
import { deliverPushPayload } from '@/lib/push/delivery'
import { DEFAULT_PUSH_ICON } from '@/lib/push/icons'

export type VisitorNoteActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string }

const MAX_MESSAGE_LENGTH = 1000
const MAX_NAME_LENGTH = 60
const RATE_LIMIT_MS = 30 * 1000 // 30 s entre notas del mismo visitante

interface CreateVisitorNoteInput {
  name?: string
  isAnonymous?: boolean
  message?: string
}

export async function createVisitorNote(
  input: CreateVisitorNoteInput,
): Promise<VisitorNoteActionResult> {
  const message = input.message?.trim() ?? ''
  if (!message) {
    return { ok: false, error: 'Escribí un mensaje antes de enviar.' }
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `El mensaje no puede superar los ${MAX_MESSAGE_LENGTH} caracteres.` }
  }

  const isAnonymous = Boolean(input.isAnonymous)
  const rawName = input.name?.trim() ?? ''
  const name = isAnonymous || !rawName ? null : rawName.slice(0, MAX_NAME_LENGTH)

  const cookieStore = await cookies()
  const visitorId = cookieStore.get('visitorId')?.value ?? null

  if (visitorId) {
    const recentNote = await prisma.visitorNote.findFirst({
      where: {
        visitorId,
        createdAt: { gte: new Date(Date.now() - RATE_LIMIT_MS) },
      },
      select: { id: true },
    })
    if (recentNote) {
      return { ok: false, error: 'Esperá unos segundos antes de enviar otra nota.' }
    }
  }

  await prisma.visitorNote.create({
    data: { name, isAnonymous, message, visitorId },
  })

  revalidatePath('/admin')

  return { ok: true, message: '¡Gracias por tu mensaje!' }
}

const ADMIN_EMAIL = 'brunoenzobaumgart@gmail.com'
const SHUTDOWN_DIALOG_CLOSED_MESSAGE = '🐥 Cerró el pop-up sin escribir nada'

async function getShutdownSender() {
  const { userId } = await auth()
  const sender = userId
    ? await prisma.user.findUnique({ where: { clerkId: userId }, select: { name: true } })
    : null

  const cookieStore = await cookies()
  const visitorId = cookieStore.get('visitorId')?.value ?? null

  return { sender, visitorId }
}

// Registra que alguien cerró el pop-up sin escribir, para saber que entró a la app.
export async function recordShutdownDialogClosed(): Promise<void> {
  const { sender, visitorId } = await getShutdownSender()

  await prisma.visitorNote.create({
    data: {
      name: sender?.name ?? null,
      isAnonymous: !sender,
      message: SHUTDOWN_DIALOG_CLOSED_MESSAGE,
      visitorId,
    },
  })

  revalidatePath('/admin')
}

// Mensaje enviado desde el pop-up de "ProdeBEB ya no está en uso".
// Se guarda como nota de visitante y se avisa al admin por push.
export async function sendShutdownMessage(input: {
  message?: string
}): Promise<VisitorNoteActionResult> {
  const message = input.message?.trim() ?? ''
  if (!message) {
    return { ok: false, error: 'Escribí un mensaje antes de enviar.' }
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `El mensaje no puede superar los ${MAX_MESSAGE_LENGTH} caracteres.` }
  }

  const { sender, visitorId } = await getShutdownSender()

  if (visitorId) {
    const recentNote = await prisma.visitorNote.findFirst({
      where: {
        visitorId,
        message: { not: SHUTDOWN_DIALOG_CLOSED_MESSAGE },
        createdAt: { gte: new Date(Date.now() - RATE_LIMIT_MS) },
      },
      select: { id: true },
    })
    if (recentNote) {
      return { ok: false, error: 'Esperá unos segundos antes de enviar otro mensaje.' }
    }
  }

  await prisma.visitorNote.create({
    data: { name: sender?.name ?? null, isAnonymous: !sender, message, visitorId },
  })

  revalidatePath('/admin')

  // La push no debe hacer fallar el envío: el mensaje ya quedó guardado.
  try {
    await notifyAdmin(sender?.name ?? null, message)
  } catch (error) {
    console.error('Shutdown message push failed', error)
  }

  return { ok: true, message: '¡Gracias! Tu mensaje le llegó al administrador.' }
}

async function notifyAdmin(senderName: string | null, message: string) {
  const adminClerkId = process.env.ADMIN_USER_ID
  const admin = await prisma.user.findFirst({
    where: {
      OR: [...(adminClerkId ? [{ clerkId: adminClerkId }] : []), { email: ADMIN_EMAIL }],
    },
    select: { id: true, pushSubscriptions: true },
  })
  if (!admin || admin.pushSubscriptions.length === 0) {
    console.warn('Shutdown message: admin has no push subscriptions')
    return
  }

  const body = message.length > 180 ? `${message.slice(0, 177)}…` : message
  await deliverPushPayload(
    admin.pushSubscriptions,
    {
      title: `🐥 Mensaje de ${senderName ?? 'un visitante'}`,
      body,
      url: '/admin?tab=visitas',
      icon: DEFAULT_PUSH_ICON,
      tag: 'shutdown-message',
    },
    { userId: admin.id },
  )
}
