import { NextResponse } from 'next/server'

import { sendDailyPushReminders } from '@/lib/push/daily-reminder'

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false

  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await sendDailyPushReminders()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('Daily push cron failed', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
