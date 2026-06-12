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
  size?: keyof typeof sizeClasses
  className?: string
}

export function UserInitialAvatar({
  name: _name,
  size = 'md',
  className,
}: UserInitialAvatarProps) {
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
