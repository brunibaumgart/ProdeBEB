import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { ensureDbUser } from '@/lib/queries/users'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dbUser = await ensureDbUser()
  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  let body: { endpoint?: string }
  try {
    body = (await request.json()) as { endpoint?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const endpoint = body.endpoint?.trim()
  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
  }

  await prisma.pushSubscription.deleteMany({
    where: {
      userId: dbUser.id,
      endpoint,
    },
  })

  const remaining = await prisma.pushSubscription.count({ where: { userId: dbUser.id } })
  if (remaining === 0) {
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { pushRemindersEnabled: false },
    })
  }

  return NextResponse.json({ ok: true })
}
