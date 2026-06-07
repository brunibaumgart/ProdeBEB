import { cn } from '@/lib/utils'

export function isFriendlyMatch(match: { isTest?: boolean | null }): boolean {
  return match.isTest === true
}

export function friendlyMatchCardClass(isFriendly: boolean, className?: string) {
  return cn(
    isFriendly
      ? 'border-violet-500/45 bg-violet-950/20'
      : 'border-border bg-card',
    className
  )
}

export function friendlyMatchHeaderClass(isFriendly: boolean) {
  return cn(
    'flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 text-xs',
    isFriendly
      ? 'border-violet-500/30 bg-violet-600/75 text-white'
      : 'border-border/60 bg-muted/40 text-white/90'
  )
}

export function friendlyMatchScoreboardClass(isFriendly: boolean) {
  return cn(
    'rounded-xl border px-3 py-3 sm:px-4',
    isFriendly
      ? 'border-violet-500/35 bg-violet-500/20'
      : 'border-border/60 bg-brand-blue/35'
  )
}
