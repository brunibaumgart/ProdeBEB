'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDownToLine, Loader2 } from 'lucide-react'

import {
  syncGroupStageFromCompleteToMatchday,
  syncGroupStageFromMatchdayToComplete,
} from '@/app/actions/sync-predictions'
import { cn } from '@/lib/utils'

type SyncDirection = 'complete-to-matchday' | 'matchday-to-complete'

interface CompletoSyncIconButtonProps {
  direction: SyncDirection
  sourceCount: number
  disabled?: boolean
  reloadOnSuccess?: boolean
  className?: string
}

const CONFIRM: Record<SyncDirection, string> = {
  'complete-to-matchday':
    '¿Importar predicciones de grupos desde el Prode Completo al Fecha a Fecha?',
  'matchday-to-complete':
    '¿Importar desde Fecha a Fecha? Se reinician eliminatorias y campeón.',
}

export function CompletoSyncIconButton({
  direction,
  sourceCount,
  disabled = false,
  reloadOnSuccess = false,
  className,
}: CompletoSyncIconButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const canSync = !disabled && sourceCount > 0

  async function handleSync() {
    if (!canSync || loading) return
    if (!window.confirm(CONFIRM[direction])) return

    setLoading(true)
    const result =
      direction === 'complete-to-matchday'
        ? await syncGroupStageFromCompleteToMatchday()
        : await syncGroupStageFromMatchdayToComplete()
    setLoading(false)

    if (result.ok) {
      if (reloadOnSuccess) window.location.reload()
      else router.refresh()
    } else {
      window.alert(result.error)
    }
  }

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={!canSync || loading}
      title={
        canSync
          ? `Importar ${sourceCount} desde Fecha a Fecha`
          : 'Sin predicciones para importar'
      }
      aria-label="Importar grupos desde Fecha a Fecha"
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40',
        className,
      )}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <ArrowDownToLine className="size-4" aria-hidden />
      )}
    </button>
  )
}
