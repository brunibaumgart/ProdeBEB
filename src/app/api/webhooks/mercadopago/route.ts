import { revalidatePath } from 'next/cache'
import type { NextRequest } from 'next/server'

import { processMercadoPagoNotification } from '@/lib/payments/tournament-checkout'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? ''
    let paymentId: string | null = null

    if (contentType.includes('application/json')) {
      const body = (await request.json()) as {
        type?: string
        action?: string
        data?: { id?: string | number }
      }
      if (body.type === 'payment' && body.data?.id != null) {
        paymentId = String(body.data.id)
      }
    } else {
      const topic = request.nextUrl.searchParams.get('topic')
      const id = request.nextUrl.searchParams.get('id')
      if (topic === 'payment' && id) {
        paymentId = id
      }
    }

    if (!paymentId) {
      return new Response('Ignored', { status: 200 })
    }

    await processMercadoPagoNotification(paymentId)
    revalidatePath('/torneos')

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Mercado Pago webhook error:', error)
    return new Response('Webhook error', { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const topic = request.nextUrl.searchParams.get('topic')
  const id = request.nextUrl.searchParams.get('id')
  if (topic === 'payment' && id) {
    try {
      await processMercadoPagoNotification(id)
      revalidatePath('/torneos')
      return new Response('OK', { status: 200 })
    } catch (error) {
      console.error('Mercado Pago webhook GET error:', error)
      return new Response('Webhook error', { status: 500 })
    }
  }
  return new Response('OK', { status: 200 })
}
