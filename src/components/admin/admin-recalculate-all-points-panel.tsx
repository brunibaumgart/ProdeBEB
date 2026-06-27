'use client'

import { Calculator, Loader2, Trophy } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'

import {
  adminRecalculateAllFinishedMatchesPoints,
  adminRecalculateCompletePositionPoints,
} from '@/app/actions/admin'
import { Button } from '@/components/ui/button'

export function AdminRecalculateAllPointsPanel() {
  const [isPending, startTransition] = useTransition()
  const [isPositionsPending, startPositionsTransition] = useTransition()

  function handleClick() {
    if (
      !window.confirm(
        'Esto va a recalcular fecha a fecha, goleadores y completo de TODOS los partidos finalizados con el criterio actual. ¿Continuar?',
      )
    ) {
      return
    }

    startTransition(async () => {
      const result = await adminRecalculateAllFinishedMatchesPoints()
      if (result.ok) {
        toast.success(result.message)
      } else {
        toast.error(result.error)
      }
    })
  }

  function handlePositionsClick() {
    startPositionsTransition(async () => {
      const result = await adminRecalculateCompletePositionPoints()
      if (result.ok) {
        toast.success(result.message)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-sm tracking-wide">Puntos de posiciones del Completo</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Recalcula los puntos de posiciones grupales ya para los grupos terminados.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPositionsPending}
            onClick={handlePositionsClick}
          >
            {isPositionsPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Trophy className="size-3.5" aria-hidden />
            )}
            Recalcular posiciones
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-sm tracking-wide">Recalcular todos los puntos</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Útil al cargar predicciones de gente que se suma después de que esos partidos ya
              terminaron: re-aplica el criterio actual a todos los partidos finalizados.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Calculator className="size-3.5" aria-hidden />
            )}
            Recalcular todo
          </Button>
        </div>
      </div>
    </div>
  )
}
