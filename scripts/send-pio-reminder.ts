import { prisma } from '@/lib/prisma'
import { deliverPushPayload } from '@/lib/push/delivery'
import { getPushNotificationIcon } from '@/lib/push/icons'

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { equals: 'pio', mode: 'insensitive' } },
    include: { pushSubscriptions: true },
  })

  if (!user) {
    console.error('Usuario pio no encontrado')
    process.exit(1)
  }

  if (user.pushSubscriptions.length === 0) {
    console.error('pio no tiene suscripciones push activas')
    process.exit(1)
  }

  const payload = {
    title: 'No te olvides de nosotros!',
    body: 'Llena el prode y no descuides tu primer puesto en 333 🐣',
    url: '/prode/fecha',
    icon: getPushNotificationIcon({ name: user.name }),
    tag: 'pio-manual-reminder',
  }

  const { sent, failed } = await deliverPushPayload(user.pushSubscriptions, payload, {
    userId: user.id,
  })

  console.log(`Enviado a ${sent} dispositivo(s), ${failed} falló(s)`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
