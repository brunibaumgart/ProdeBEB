import { config } from 'dotenv'

config({ path: '.env.local' })

import { createMercadoPagoPreference } from '../src/lib/payments/mercadopago'

async function main() {
  try {
    const checkout = await createMercadoPagoPreference({
      paymentId: 'test-payment-id',
      title: 'Test torneo',
      amount: 500,
      payerEmail: 'test@test.com',
    })
    console.log('OK', checkout.checkoutUrl.slice(0, 100))
  } catch (error) {
    console.error('ERR', error instanceof Error ? error.message : error)
  }
}

main()
