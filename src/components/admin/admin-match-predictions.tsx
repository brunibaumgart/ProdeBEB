'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

import { loadAdminMatchPredictions } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { AdminPredictionTable } from '@/components/admin/admin-prediction-table'
import type { AdminPredictionView } from '@/lib/queries/admin'
import { cn } from '@/lib/utils'

interface AdminMatchPredictionsProps {
  matchId: number
  totalPredictions: number
  initialPredictions?: AdminPredictionView[]
  className?: string
}

export function AdminMatchPredictions({
  matchId,
  totalPredictions,
  initialPredictions,
  className,
}: AdminMatchPredictionsProps) {
  const [open, setOpen] = useState(false)
  const [predictions, setPredictions] = useState<AdminPredictionView[] | null>(
    initialPredictions ?? null,
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (totalPredictions === 0) return null

  function toggleOpen() {
    if (open) {
      setOpen(false)
      return
    }

    if (predictions) {
      setOpen(true)
      return
    }

    startTransition(async () => {
      const result = await loadAdminMatchPredictions(matchId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setPredictions(result.predictions)
      setOpen(true)
    })
  }

  return (
    <div className={cn('border-t border-border/60 bg-muted/10', className)}>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <p className="text-xs font-medium text-muted-foreground">
          Predicciones de usuarios ({totalPredictions})
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={toggleOpen} disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : open ? (
            <ChevronUp className="size-3.5" aria-hidden />
          ) : (
            <ChevronDown className="size-3.5" aria-hidden />
          )}
          {open ? 'Ocultar' : 'Ver predicciones'}
        </Button>
      </div>

      {error ? <p className="px-4 pb-3 text-sm text-destructive">{error}</p> : null}

      {open && predictions ? (
        <div className="px-4 pb-4">
          <AdminPredictionTable predictions={predictions} compact />
        </div>
      ) : null}
    </div>
  )
}
