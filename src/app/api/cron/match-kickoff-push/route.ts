import { NextResponse } from 'next/server'

import { isCronAuthorized } from '@/lib/push/cron-auth'
import { sendMatchKickoffPushNotifications } from '@/lib/push/kickoff'

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await sendMatchKickoffPushNotifications()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('Match kickoff push cron failed', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
