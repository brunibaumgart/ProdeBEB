import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import { cn } from '@/lib/utils'

interface TeamBadgeProps {
  name: string
  iso2?: string
  flagEmoji?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  reverse?: boolean
}

const textSizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg font-medium',
}

export function TeamBadge({
  name,
  iso2,
  flagEmoji,
  size = 'md',
  className,
  reverse = false,
}: TeamBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2',
        reverse && 'flex-row-reverse',
        textSizes[size],
        className
      )}
    >
      {iso2 ? (
        <FlagIcon iso2={iso2} flagEmoji={flagEmoji} size={size} />
      ) : flagEmoji ? (
        <span className="text-lg leading-none" aria-hidden>
          {flagEmoji}
        </span>
      ) : null}
      <span className="truncate">{name}</span>
    </span>
  )
}
