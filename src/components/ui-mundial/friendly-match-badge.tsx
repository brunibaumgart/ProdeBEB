import { cn } from '@/lib/utils'

interface FriendlyMatchBadgeProps {
  className?: string
  size?: 'sm' | 'md'
}

export function FriendlyMatchBadge({ className, size = 'sm' }: FriendlyMatchBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-full bg-violet-500/25 font-semibold uppercase tracking-wide text-violet-200',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        className
      )}
    >
      Amistoso
    </span>
  )
}
