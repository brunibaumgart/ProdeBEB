import { isPioProfile } from '@/lib/personal/pio-countdown'
import { cn } from '@/lib/utils'

export function getUserInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed.charAt(0).toUpperCase()
}

const sizeClasses = {
  sm: 'size-7 rounded-full text-xs',
  md: 'size-8 rounded-full text-sm',
  lg: 'size-20 rounded-2xl font-heading text-3xl',
} as const

interface UserInitialAvatarProps {
  name: string
  username?: string | null
  size?: keyof typeof sizeClasses
  className?: string
}

function GenericProdeAvatar({
  size,
  className,
}: {
  size: keyof typeof sizeClasses
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center border border-border bg-primary font-heading font-medium text-primary-foreground',
        sizeClasses[size],
        className,
      )}
    >
      P
    </span>
  )
}

function PioPollitosAvatar({
  size,
  className,
}: {
  size: keyof typeof sizeClasses
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden border border-border bg-gradient-to-br from-[#1A1A2E] to-[#0D0D1A]',
        sizeClasses[size],
        className,
      )}
    >
      <img
        src="/brand/beb-pollitos.png"
        alt=""
        className={cn(
          'object-contain',
          size === 'lg' ? 'size-[88%]' : 'size-[92%]',
        )}
      />
    </span>
  )
}

export function UserInitialAvatar({
  name,
  username,
  size = 'md',
  className,
}: UserInitialAvatarProps) {
  if (isPioProfile({ name, username })) {
    return <PioPollitosAvatar size={size} className={className} />
  }

  return <GenericProdeAvatar size={size} className={className} />
}
