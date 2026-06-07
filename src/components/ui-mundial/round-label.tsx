import { getRounds } from '@/lib/data'
import { ROUND_LABELS, type MatchRound } from '@/types'
import { cn } from '@/lib/utils'

interface RoundLabelProps {
  round: MatchRound | string
  variant?: 'full' | 'short' | 'badge'
  className?: string
}

export function RoundLabel({ round, variant = 'full', className }: RoundLabelProps) {
  const rounds = getRounds()
  const config = rounds[round as MatchRound]
  const label =
    variant === 'short'
      ? (config?.short ?? round)
      : variant === 'badge'
        ? (config?.short ?? ROUND_LABELS[round as MatchRound] ?? round).toUpperCase()
        : (config?.label_es ?? ROUND_LABELS[round as MatchRound] ?? round)

  if (variant === 'badge') {
    return (
      <span
        className={cn(
          'inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground',
          className
        )}
      >
        {label}
      </span>
    )
  }

  return <span className={cn('font-medium', className)}>{label}</span>
}
