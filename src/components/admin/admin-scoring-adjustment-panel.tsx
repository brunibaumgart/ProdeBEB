'use client'

import { Calculator, Megaphone } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import {
  adminRecalculateMatchdayDrawScoring,
  adminSendMatchdayDrawScoringNoticePush,
} from '@/app/actions/announcements'
import { Button } from '@/components/ui/button'

export function AdminScoringAdjustmentPanel() {
  const [isPending, startTransition] = useTransition()
  const [lastRecalcMessage, setLastRecalcMessage] = useState<string | null>(null)

  function handleRecalculate() {
    startTransition(async () => {
      const result = await adminRecalculateMatchdayDrawScoring()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setLastRecalcMessage(result.message)
      toast.success(result.message)
    })
  }

  function handleSendPush() {
    startTransition(async () => {
      const result = await adminSendMatchdayDrawScoringNoticePush()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message)
    })
  }

  return (
    <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
      <h2 className="font-heading text-lg tracking-wide text-foreground">
        Ajuste puntos de empate (Fecha a Fecha)
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Orden recomendado: <strong>1) Recalcular puntos</strong> → <strong>2) Enviar push</strong>.
        El aviso abre un modal en la app (`/?aviso=puntos-empate`).
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="default" disabled={isPending} onClick={handleRecalculate}>
          <Calculator data-icon="inline-start" aria-hidden />
          {isPending ? 'Procesando…' : 'Recalcular todos los puntos'}
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={handleSendPush}>
          <Megaphone data-icon="inline-start" aria-hidden />
          Enviar push de aviso
        </Button>
      </div>

      {lastRecalcMessage ? (
        <p className="mt-3 text-xs text-muted-foreground">{lastRecalcMessage}</p>
      ) : null}
    </section>
  )
}
