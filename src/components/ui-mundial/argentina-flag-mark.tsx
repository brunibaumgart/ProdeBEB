import { cn } from '@/lib/utils'

interface ArgentinaFlagMarkProps {
  className?: string
  width?: number
  height?: number
}

export function ArgentinaFlagMark({
  className,
  width = 24,
  height = 36,
}: ArgentinaFlagMarkProps) {
  return (
    <div
      aria-hidden
      className={cn('overflow-hidden rounded-sm border border-white/20 shadow-sm', className)}
      style={{ width, height, display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ flex: 1, background: '#75AADB' }} />
      <div style={{ flex: 1, background: '#FFFFFF' }} />
      <div style={{ flex: 1, background: '#75AADB' }} />
    </div>
  )
}
