import Link from 'next/link'
import { redirect } from 'next/navigation'

import { refreshTournamentPayment } from '@/app/actions/tournaments'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { processMercadoPagoNotification } from '@/lib/payments/tournament-checkout'
import { ensureDbUser } from '@/lib/queries/users'

interface PaymentResultPageProps {
  params: Promise<{ status: string }>
  searchParams: Promise<{ ref?: string; payment_id?: string; collection_id?: string }>
}

const COPY = {
  exito: {
    title: 'Pago recibido',
    description: 'Estamos confirmando tu pago con Mercado Pago.',
  },
  pendiente: {
    title: 'Pago pendiente',
    description: 'Mercado Pago está procesando tu pago. Volvé en unos minutos.',
  },
  error: {
    title: 'Pago no completado',
    description: 'El pago fue cancelado o rechazado. Podés intentarlo de nuevo desde Torneos.',
  },
} as const

export default async function PaymentResultPage({ params, searchParams }: PaymentResultPageProps) {
  const user = await ensureDbUser()
  if (!user) redirect('/torneos')

  const { status } = await params
  const query = await searchParams
  const copy = COPY[status as keyof typeof COPY]

  if (!copy) redirect('/torneos')

  let message: string = copy.description
  let tournamentId: string | undefined

  if (status === 'exito' || status === 'pendiente') {
    const mpPaymentId = query.payment_id ?? query.collection_id
    if (mpPaymentId) {
      const payment = await processMercadoPagoNotification(mpPaymentId)
      if (payment?.fulfilledAt) {
        tournamentId = payment.tournamentId ?? undefined
        message =
          payment.type === 'tournament_create'
            ? 'Pago confirmado. Tu torneo ya está listo.'
            : 'Pago confirmado. Ya formás parte del torneo.'
      }
    } else if (query.ref) {
      const result = await refreshTournamentPayment(query.ref)
      if (result.ok) {
        message = result.message
        tournamentId = result.tournamentId
      } else if (status === 'exito') {
        message = result.error
      }
    }
  }

  return (
    <AppShell pathname="/torneos">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
        <h1 className="font-heading text-3xl tracking-wide">{copy.title.toUpperCase()}</h1>
        <p className="text-muted-foreground">{message}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {tournamentId ? (
            <Button render={<Link href={`/torneos/${tournamentId}`} />}>Ver torneo</Button>
          ) : null}
          <Button variant="outline" render={<Link href="/torneos" />}>
            Volver a torneos
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
