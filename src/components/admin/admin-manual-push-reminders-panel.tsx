'use client'

import { BellRing } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'

import { adminSendManualDailyPredictionsReminderPush } from '@/app/actions/push'
import { Button } from '@/components/ui/button'

export function AdminManualPushRemindersPanel() {
  const [isPending, startTransition] = useTransition()

  function handleSendReminder() {
    startTransition(async () => {
      const result = await adminSendManualDailyPredictionsReminderPush()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message)
    })
  }

  return (
    <section className="rounded-xl border border-primary/25 bg-primary/5 p-4">
      <h2 className="font-heading text-lg tracking-wide text-foreground">
        Recordatorio manual (Fecha a Fecha)
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Envía push a quienes tienen <strong>recordatorio 11:00</strong> activo y dispositivo
        suscripto. Título: «¿Ya cargaste tus resultados de hoy?». Si le falta cargar algo hoy, el
        cuerpo lista los partidos pendientes.
      </p>

      <div className="mt-4">
        <Button type="button" disabled={isPending} onClick={handleSendReminder}>
          <BellRing data-icon="inline-start" aria-hidden />
          {isPending ? 'Enviando…' : 'Enviar recordatorio de hoy'}
        </Button>
      </div>
    </section>
  )
}
