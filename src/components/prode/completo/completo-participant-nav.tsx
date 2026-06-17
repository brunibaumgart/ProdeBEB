'use client'

import { cn } from '@/lib/utils'
import type { CelebrityBracket, CompletoParticipantId } from '@/lib/bracket/celebrity-predictions'
import type { CelebrityPointsBreakdown } from '@/lib/scoring/complete/celebrity-points'

interface CompletoParticipantNavProps {
  participant: CompletoParticipantId
  onParticipantChange: (participant: CompletoParticipantId) => void
  celebrities: CelebrityBracket[]
  celebrityPoints: Partial<Record<string, CelebrityPointsBreakdown>>
  className?: string
}

export function CompletoParticipantNav({
  participant,
  onParticipantChange,
  celebrities,
  celebrityPoints,
  className,
}: CompletoParticipantNavProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => onParticipantChange('mine')}
          className={cn(
            'rounded-lg px-2 py-2 text-center text-[11px] font-semibold transition-colors',
            participant === 'mine'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-card/80',
          )}
        >
          Mi prode
        </button>
        <button
          type="button"
          onClick={() => {
            if (participant === 'mine') {
              onParticipantChange(celebrities[0]?.id ?? 'davo')
            }
          }}
          className={cn(
            'rounded-lg px-2 py-2 text-center text-[11px] font-semibold transition-colors',
            participant !== 'mine'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-card/80',
          )}
        >
          Famosos BEB
        </button>
      </div>

      {participant !== 'mine' ? (
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {celebrities.map((celebrity) => {
            const active = participant === celebrity.id
            const points = celebrityPoints[celebrity.id]?.total
            return (
              <button
                key={celebrity.id}
                type="button"
                onClick={() => onParticipantChange(celebrity.id)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-left transition-colors',
                  active
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-card/60 text-muted-foreground hover:border-primary/30',
                )}
              >
                <span className="block text-[11px] font-semibold leading-tight">
                  {celebrity.label}
                </span>
                {points != null ? (
                  <span className="text-[10px] tabular-nums opacity-80">{points} pts</span>
                ) : (
                  <span className="text-[10px] opacity-70">
                    {celebrity.groupInputMode === 'standings-only' ? 'Posiciones' : 'Completo'}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

interface CompletoParticipantHeaderProps {
  celebrity: CelebrityBracket
  points: CelebrityPointsBreakdown | null
  onShowGallery?: () => void
  className?: string
}

export function CompletoParticipantHeader({
  celebrity,
  points,
  onShowGallery,
  className,
}: CompletoParticipantHeaderProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/70 bg-card/60 px-3 py-2.5 text-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-foreground">{celebrity.label}</p>
          <p className="text-xs text-muted-foreground">{celebrity.description}</p>
          <p className="text-xs text-muted-foreground">
            Campeón: <span className="font-medium text-foreground">{celebrity.championNameEs}</span>
            {celebrity.groupInputMode === 'standings-only' ? (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px]">
                Solo posiciones en grupos
              </span>
            ) : null}
          </p>
        </div>
        {points ? (
          <div className="shrink-0 text-right">
            <p className="font-heading text-2xl tabular-nums text-primary">{points.total}</p>
            <p className="text-[10px] text-muted-foreground">puntos</p>
          </div>
        ) : null}
      </div>
      {points ? (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Llave {points.knockout} · Posiciones {points.positions} · Campeón {points.champion}
        </p>
      ) : null}
      {onShowGallery ? (
        <button
          type="button"
          onClick={onShowGallery}
          className="mt-2 text-xs font-medium text-primary hover:underline"
        >
          Ver capturas originales
        </button>
      ) : null}
    </div>
  )
}
