import { POSITION_CONFIG, type Position } from '@/types'
import { cn } from '@/lib/utils'

interface PositionBadgeProps {
  position: Position
  className?: string
}

export function PositionBadge({ position, className }: PositionBadgeProps) {
  const config = POSITION_CONFIG[position]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white',
        className
      )}
      style={{ backgroundColor: config.color }}
    >
      {config.short}
    </span>
  )
}
