'use client'

import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import { TeamBadge } from '@/components/ui-mundial/team-badge'
import type { Standing } from '@/lib/bracket'
import type { R32OpponentProjection } from '@/lib/bracket/group-r32-opponents'
import { cn } from '@/lib/utils'

interface GroupR32OpponentsPanelProps {
  group: string
  standings: Standing[]
  projections: R32OpponentProjection[]
  allGroupsComplete?: boolean
  className?: string
}

export function GroupR32OpponentsPanel({
  group,
  standings,
  projections,
  allGroupsComplete = false,
  className,
}: GroupR32OpponentsPanelProps) {
  const showProvisionalNotice = !allGroupsComplete || projections.some((entry) => entry.provisional)

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card', className)}>
      <div className="border-b border-border bg-muted/40 px-4 py-2">
        <h3 className="font-heading text-sm tracking-wide text-primary">
          RIVAL EN DIECISEISAVOS · GRUPO {group}
        </h3>
        <p className="text-xs text-muted-foreground">
          Según quién ocupa cada puesto en este momento
        </p>
      </div>

      <ul className="divide-y divide-border/60">
        {standings.map((standing, index) => {
          const projection = projections[index]
          if (!projection) return null

          const isQualified = projection.status === 'qualified'
          const isThird = index === 2
          const isEliminated = projection.status === 'eliminated'
          const hasOpponent = Boolean(projection.opponentDisplay)

          return (
            <li
              key={standing.teamName}
              className={cn(
                'flex items-start gap-3 px-4 py-3',
                index < 2 && isQualified && 'bg-brand-green/5',
                isThird && 'bg-muted/15',
              )}
            >
              <span className="mt-0.5 w-4 shrink-0 text-xs tabular-nums text-muted-foreground">
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <TeamBadge
                  name={standing.team?.nameEs ?? standing.teamName}
                  iso2={standing.team?.iso2}
                  flagEmoji={standing.team?.flagEmoji}
                  size="sm"
                />

                <div className="mt-2 text-xs">
                  {hasOpponent ? (
                    <div className="flex flex-col gap-1.5 text-foreground sm:flex-row sm:flex-wrap sm:items-center">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                          {projection.matchLabel}
                        </span>
                        {projection.provisional && (
                          <span className="rounded bg-brand-gold/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-gold">
                            Prov.
                          </span>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="text-muted-foreground">
                          {projection.isHome ? 'Local vs' : 'Visitante vs'}
                        </span>
                        {projection.opponentTeam ? (
                          <span className="inline-flex min-w-0 items-center gap-1 font-medium">
                            <FlagIcon
                              iso2={projection.opponentTeam.iso2}
                              flagEmoji={projection.opponentTeam.flagEmoji}
                              size="sm"
                            />
                            <span className="truncate">{projection.opponentDisplay}</span>
                          </span>
                        ) : (
                          <span className="font-medium break-words">{projection.opponentDisplay}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p
                      className={cn(
                        'text-muted-foreground',
                        projection.status === 'not_qualified' && 'text-destructive/80',
                        isEliminated && 'text-muted-foreground/80',
                      )}
                    >
                      {projection.note ?? 'Sin proyección'}
                    </p>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {showProvisionalNotice && (
        <p className="border-t border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          Proyección provisoria según las posiciones actuales. Para mayor precisión, completá todos
          los resultados de la fase de grupos.
        </p>
      )}
    </div>
  )
}
