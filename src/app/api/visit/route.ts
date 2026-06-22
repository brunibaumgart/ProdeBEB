import { randomUUID } from 'node:crypto'

import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

const VISITOR_COOKIE = 'visitorId'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 año
const DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000 // 6 horas

interface VisitBody {
  path?: string
}

export async function POST(request: Request) {
  // No trackeamos usuarios con sesión.
  const { userId } = await auth()
  if (userId) {
    return NextResponse.json({ ok: true, tracked: false })
  }

  const cookieStore = await cookies()
  let visitorId = cookieStore.get(VISITOR_COOKIE)?.value
  if (!visitorId) {
    visitorId = randomUUID()
    cookieStore.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    })
  }

  let path: string | undefined
  try {
    const body = (await request.json()) as VisitBody
    path = typeof body.path === 'string' ? body.path.slice(0, 512) : undefined
  } catch {
    path = undefined
  }

  // Dedupe: evitar inflar por recargas dentro de una ventana corta.
  const recentVisit = await prisma.anonymousVisit.findFirst({
    where: {
      visitorId,
      createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
    },
    select: { id: true },
  })

  if (!recentVisit) {
    await prisma.anonymousVisit.create({
      data: { visitorId, path },
    })
  }

  return NextResponse.json({ ok: true, tracked: !recentVisit })
}
