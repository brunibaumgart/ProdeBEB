import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'

import { getSiteUrl } from '@/lib/site-url'

export function getMercadoPagoAccessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) {
    throw new Error('MP_ACCESS_TOKEN no está configurado.')
  }
  return token
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MP_ACCESS_TOKEN?.trim())
}

/** Credenciales TEST-... = sandbox sin cobros reales. APP_USR-... = producción. */
export function isMercadoPagoTestMode(): boolean {
  return getMercadoPagoAccessToken().startsWith('TEST-')
}

function resolveCheckoutUrl(response: {
  init_point?: string
  sandbox_init_point?: string
}): string | undefined {
  if (isMercadoPagoTestMode()) {
    return response.sandbox_init_point ?? response.init_point
  }
  return response.init_point ?? response.sandbox_init_point
}

function getMercadoPagoClient() {
  return new MercadoPagoConfig({ accessToken: getMercadoPagoAccessToken() })
}

function isLocalDevUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')
  } catch {
    return true
  }
}

function getMercadoPagoWebhookUrl(siteUrl: string): string | undefined {
  if (isLocalDevUrl(siteUrl)) {
    const productionUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
    if (productionUrl && !isLocalDevUrl(productionUrl)) {
      return `${productionUrl}/api/webhooks/mercadopago`
    }
    return undefined
  }
  return `${siteUrl}/api/webhooks/mercadopago`
}

function parseMercadoPagoError(error: unknown): string {
  if (error && typeof error === 'object') {
    const err = error as { message?: string; error?: string; cause?: unknown }
    if (err.message) return err.message
    if (err.error) return String(err.error)
  }
  return 'No se pudo iniciar el pago con Mercado Pago.'
}

export async function createMercadoPagoPreference(input: {
  paymentId: string
  title: string
  amount: number
  payerEmail: string
}) {
  const client = getMercadoPagoClient()
  const preference = new Preference(client)
  const siteUrl = getSiteUrl()
  const returnBase = `${siteUrl}/torneos/pago`
  const localDev = isLocalDevUrl(siteUrl)
  const webhookUrl = getMercadoPagoWebhookUrl(siteUrl)

  try {
    const response = await preference.create({
      body: {
        items: [
          {
            id: input.paymentId.slice(0, 256),
            title: input.title,
            quantity: 1,
            unit_price: input.amount,
            currency_id: 'ARS',
          },
        ],
        payer: { email: input.payerEmail },
        external_reference: input.paymentId,
        back_urls: {
          success: `${returnBase}/exito?ref=${input.paymentId}`,
          failure: `${returnBase}/error?ref=${input.paymentId}`,
          pending: `${returnBase}/pendiente?ref=${input.paymentId}`,
        },
        ...(localDev ? {} : { auto_return: 'approved' as const }),
        ...(webhookUrl ? { notification_url: webhookUrl } : {}),
      },
    })

    const checkoutUrl = resolveCheckoutUrl(response)
    if (!checkoutUrl || !response.id) {
      throw new Error('Mercado Pago no devolvió URL de checkout.')
    }

    return {
      preferenceId: String(response.id),
      checkoutUrl,
    }
  } catch (error) {
    throw new Error(parseMercadoPagoError(error))
  }
}

export async function fetchMercadoPagoPayment(paymentId: string) {
  const client = getMercadoPagoClient()
  const payment = new Payment(client)
  return payment.get({ id: paymentId })
}

export function isApprovedMercadoPagoPayment(status: string | undefined): boolean {
  return status === 'approved'
}
