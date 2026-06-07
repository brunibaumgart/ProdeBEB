'use client'

import { Lock } from 'lucide-react'

import { cn } from '@/lib/utils'

interface ScoreInputProps {
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
  locked?: boolean
  label?: string
  hideLabel?: boolean
  className?: string
}

export function ScoreInput({
  value,
  onChange,
  disabled = false,
  locked = false,
  label,
  hideLabel = false,
  className,
}: ScoreInputProps) {
  const isDisabled = disabled || locked

  return (
    <div className={cn('relative inline-flex flex-col items-center gap-1', className)}>
      {label && !hideLabel && (
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      )}
      <input
        type="number"
        min={0}
        max={20}
        step={1}
        inputMode="numeric"
        value={value ?? ''}
        disabled={isDisabled}
        aria-label={label ?? 'Goles'}
        onChange={(event) => {
          const raw = event.target.value
          if (raw === '') {
            onChange(null)
            return
          }
          const parsed = parseInt(raw, 10)
          if (Number.isNaN(parsed)) return
          onChange(Math.min(20, Math.max(0, parsed)))
        }}
        className={cn(
          'h-12 w-12 rounded-lg border border-input bg-background text-center font-heading text-2xl tabular-nums text-foreground',
          'focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
        )}
      />
      {locked && (
        <Lock className="absolute -right-1 -top-1 size-3.5 text-muted-foreground" aria-hidden />
      )}
    </div>
  )
}
