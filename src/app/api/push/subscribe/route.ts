import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { canUsePushReminders } from '@/lib/push/config'
import { prisma } from '@/lib/prisma'
import { ensureDbUser } from '@/lib/queries/users'

interface PushSubscriptionBody {
  endpoint?: string
  keys?: {
    p256dh?: string
    auth?: string
  }
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dbUser = await ensureDbUser()
  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (!canUsePushReminders(dbUser)) {
    return NextResponse.json({ error: 'Push reminders are not available yet.' }, { status: 403 })
  }

  let body: PushSubscriptionBody
  try {
    body = (await request.json()) as PushSubscriptionBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const endpoint = body.endpoint?.trim()
  const p256dh = body.keys?.p256dh?.trim()
  const authKey = body.keys?.auth?.trim()

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: 'Invalid push subscription payload' }, { status: 400 })
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: dbUser.id,
      endpoint,
      p256dh,
      auth: authKey,
    },
    update: {
      userId: dbUser.id,
      p256dh,
      auth: authKey,
    },
  })

  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      pushRemindersEnabled: true,
      pushReminderPromptSeenAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true })
}
