import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import { cn } from '@/lib/utils'

interface BebMascotMarkProps {
  className?: string
  imageClassName?: string
  showLabel?: boolean
}

export function BebMascotMark({
  className,
  imageClassName,
  showLabel = true,
}: BebMascotMarkProps) {
  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <img
        src="/brand/beb-pollitos.png"
        alt=""
        aria-hidden
        className={cn('h-16 w-auto max-w-[140px] object-contain drop-shadow-sm', imageClassName)}
      />
      <FlagIcon iso2="AR" size="md" className="rounded-sm shadow-sm" />
      {showLabel ? (
        <span className="font-heading text-lg leading-none tracking-[0.28em] text-brand-gold">
          BEB
        </span>
      ) : null}
    </div>
  )
}
