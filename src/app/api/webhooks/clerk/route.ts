import type { UserJSON } from '@clerk/backend'
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import type { NextRequest } from 'next/server'

import { deleteUserByClerkId, syncUserFromWebhook } from '@/lib/auth/sync-user'

export async function POST(req: NextRequest) {
  try {
    const event = await verifyWebhook(req)

    switch (event.type) {
      case 'user.created':
      case 'user.updated':
        await syncUserFromWebhook(event.data as UserJSON)
        break
      case 'user.deleted':
        await deleteUserByClerkId(event.data.id!)
        break
      default:
        break
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Clerk webhook error:', error)
    return new Response('Webhook verification failed', { status: 400 })
  }
}
