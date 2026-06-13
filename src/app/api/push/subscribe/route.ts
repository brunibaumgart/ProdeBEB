import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { canReceiveSurprisePush } from '@/lib/push/preferences'
import { isPioProfile } from '@/lib/personal/pio-countdown'
import { prisma } from '@/lib/prisma'
import { ensureDbUser } from '@/lib/queries/users'

interface PushSubscriptionBody {
  endpoint?: string
  keys?: {
    p256dh?: string
    auth?: string
  }
  preferences?: {
    reminders?: boolean
    kickoff?: boolean
    surprise?: boolean
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

  const prefs = body.preferences ?? {}
  const pushRemindersEnabled = prefs.reminders ?? true
  const pushKickoffEnabled = prefs.kickoff ?? false
  const eligibleForSurprise = canReceiveSurprisePush({
    name: dbUser.name,
    email: dbUser.email,
    isAdmin: dbUser.isAdmin,
    clerkId: dbUser.clerkId,
  })
  const pushSurpriseEnabled = eligibleForSurprise
    ? isPioProfile(dbUser)
      ? dbUser.pushSurpriseEnabled
      : (prefs.surprise ?? false)
    : false

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
      pushRemindersEnabled,
      pushKickoffEnabled,
      pushSurpriseEnabled,
      pushReminderPromptSeenAt: new Date(),
      pushSetupPromptSeenAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true })
}
