import { Lock } from 'lucide-react'

import { cn } from '@/lib/utils'

interface PredictionLockProps {
  reason?: string
  className?: string
}

export function PredictionLock({ reason = 'Predicción cerrada', className }: PredictionLockProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground',
        className
      )}
    >
      <Lock className="size-3.5 shrink-0" aria-hidden />
      <span>{reason}</span>
    </div>
  )
}
