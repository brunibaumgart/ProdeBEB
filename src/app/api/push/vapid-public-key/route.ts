import { NextResponse } from 'next/server'

import { getPublicVapidKey } from '@/lib/push/web-push-server'

export async function GET() {
  try {
    return NextResponse.json({ publicKey: getPublicVapidKey() })
  } catch {
    return NextResponse.json({ error: 'Push notifications are not configured.' }, { status: 503 })
  }
}
