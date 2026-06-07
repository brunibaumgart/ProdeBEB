import { cn } from '@/lib/utils'
import { getFlagCode } from '@/lib/flags'

interface FlagIconProps {
  iso2: string
  flagEmoji?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'text-base leading-none',
  md: 'text-xl leading-none',
  lg: 'text-3xl leading-none',
}

export function FlagIcon({ iso2, flagEmoji, className, size = 'md' }: FlagIconProps) {
  const code = getFlagCode(iso2)

  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center', sizeClasses[size], className)}
      aria-hidden
    >
      <span className={cn(`fi fi-${code}`, 'rounded-sm shadow-sm')} />
      <span className="sr-only">{flagEmoji ?? iso2}</span>
    </span>
  )
}
