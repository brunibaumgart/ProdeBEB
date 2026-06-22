'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { prisma } from '@/lib/prisma'

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
