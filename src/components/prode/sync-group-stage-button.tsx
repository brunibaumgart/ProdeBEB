'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight, Loader2 } from 'lucide-react'

import {
  syncGroupStageFromCompleteToMatchday,
  syncGroupStageFromMatchdayToComplete,
} from '@/app/actions/sync-predictions'
import { cn } from '@/lib/utils'

type SyncDirection = 'complete-to-matchday' | 'matchday-to-complete'

interface SyncGroupStageButtonProps {
  direction: SyncDirection
  sourceCount: number
  totalGroupMatches: number
  disabled?: boolean
  reloadOnSuccess?: boolean
  onSynced?: () => void
  className?: string
}

const LABELS: Record<
  SyncDirection,
  { title: string; description: (count: number) => string; confirm: string }
> = {
  'complete-to-matchday': {
    title: 'Importar desde Prode Completo',
    description: (count) =>
      `Copiar ${count} predicción${count === 1 ? '' : 'es'} de fase de grupos al Fecha a Fecha.`,
    confirm: '¿Importar predicciones de grupos desde el Prode Completo?',
  },
  'matchday-to-complete': {
    title: 'Importar desde Fecha a Fecha',
    description: (count) =>
      `Copiar ${count} predicción${count === 1 ? '' : 'es'} como victoria/empate al Prode Completo. Reinicia eliminatorias y campeón.`,
    confirm:
      '¿Importar resultados (victoria/empate) desde Fecha a Fecha? Se borrarán tus cruces de eliminatorias y el campeón.',
  },
}

export function SyncGroupStageButton({
  direction,
  sourceCount,
  totalGroupMatches,
  disabled = false,
  reloadOnSuccess = false,
  onSynced,
  className,
}: SyncGroupStageButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const labels = LABELS[direction]
  const canSync = !disabled && sourceCount > 0

  async function handleSync() {
    if (!canSync) return
    if (!window.confirm(labels.confirm)) return

    setLoading(true)
    setFeedback(null)

    const result =
      direction === 'complete-to-matchday'
        ? await syncGroupStageFromCompleteToMatchday()
        : await syncGroupStageFromMatchdayToComplete()

    setLoading(false)

    if (result.ok) {
      setFeedback(result.message)
      onSynced?.()
      if (reloadOnSuccess) {
        window.location.reload()
      } else {
        router.refresh()
      }
    } else {
      setFeedback(result.error)
    }
  }

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">{labels.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {sourceCount > 0
              ? labels.description(sourceCount)
              : `No hay predicciones de grupos para importar (0/${totalGroupMatches}).`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={!canSync || loading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ArrowLeftRight className="size-4" aria-hidden />
          )}
          Importar grupos
        </button>
      </div>
      {feedback && (
        <p
          className={cn(
            'mt-3 text-xs',
            feedback.includes('Importad') ? 'text-brand-green' : 'text-destructive'
          )}
        >
          {feedback}
        </p>
      )}
    </div>
  )
}
