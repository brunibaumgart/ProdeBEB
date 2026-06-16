import type { ReactNode } from 'react'

import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import { TeamBadge } from '@/components/ui-mundial/team-badge'
import { cn } from '@/lib/utils'
import type { Standing } from '@/lib/bracket'
import type { R32OpponentProjection } from '@/lib/bracket/group-r32-opponents'

interface GroupTableProps {
  group: string
  standings: Standing[]
  compact?: boolean
  embedded?: boolean
  r32Projections?: R32OpponentProjection[]
  headerAction?: ReactNode
  className?: string
}

export function R32CompactBadge({
  projection,
  className,
}: {
  projection: R32OpponentProjection
  className?: string
}) {
  if (projection.status === 'eliminated' || projection.status === 'not_qualified') {
    return (
      <span
        className={cn(
          'inline-flex w-fit shrink-0 items-center rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground',
          className,
        )}
      >
        eliminado
      </span>
    )
  }

  if (projection.status === 'qualified' && projection.opponentTeam) {
    return (
      <span
        className={cn(
          'inline-flex w-fit shrink-0 items-center gap-1 rounded-full border border-brand-gold/35 bg-brand-gold/10 px-2 py-0.5',
          className,
        )}
      >
        <span className="text-[9px] font-bold uppercase tracking-wide text-brand-gold">16avos</span>
        <span className="text-[9px] text-muted-foreground/80">vs</span>
        <FlagIcon
          iso2={projection.opponentTeam.iso2}
          flagEmoji={projection.opponentTeam.flagEmoji}
          size="sm"
        />
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center rounded-full border border-brand-gold/25 bg-brand-gold/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand-gold/80',
        className,
      )}
    >
      16avos
    </span>
  )
}

export function GroupTable({
  group,
  standings,
  compact = false,
  embedded = false,
  r32Projections,
  headerAction,
  className,
}: GroupTableProps) {
  const showR32 = compact && r32Projections != null
  return (
    <div
      className={cn(
        !embedded && 'overflow-hidden rounded-xl border border-border bg-card',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2">
        <h3 className="min-w-0 truncate font-heading text-lg tracking-wide text-primary">GRUPO {group}</h3>
        {headerAction}
      </div>
      <div className={cn(!compact && 'overflow-x-auto')}>
        <table
          className={cn(
            'w-full text-sm',
            compact ? 'min-w-0 text-xs' : 'min-w-[480px]',
          )}
        >
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className={cn('py-2 text-left font-medium', compact ? 'w-7 px-2' : 'px-3')}>
                #
              </th>
              <th className={cn('py-2 text-left font-medium', compact ? 'px-2' : 'px-3')}>
                Equipo
              </th>
              <th
                className={cn(
                  'py-2 text-center font-medium',
                  compact ? 'hidden' : 'px-2',
                )}
              >
                PJ
              </th>
              {!compact && (
                <>
                  <th className="px-2 py-2 text-center font-medium">PG</th>
                  <th className="px-2 py-2 text-center font-medium">PE</th>
                  <th className="px-2 py-2 text-center font-medium">PP</th>
                  <th className="px-2 py-2 text-center font-medium">GF</th>
                  <th className="px-2 py-2 text-center font-medium">GC</th>
                </>
              )}
              <th className={cn('py-2 text-center font-medium', compact ? 'w-9 px-1' : 'px-2')}>
                DG
              </th>
              <th className={cn('py-2 text-center font-medium', compact ? 'w-9 px-1' : 'px-2')}>
                Pts
              </th>
              {showR32 && (
                <th className="w-px px-1 py-2 text-center font-medium text-[10px] text-muted-foreground">
                  <span className="sr-only">Dieciseisavos</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {standings.map((standing, index) => {
              const isQualified = index < 2
              const isThird = index === 2

              return (
                <tr
                  key={standing.teamName}
                  className={cn(
                    'border-b border-border/60 last:border-0',
                    isQualified && 'bg-brand-green/5',
                    isThird && 'bg-muted/20'
                  )}
                >
                  <td
                    className={cn(
                      'py-2.5 tabular-nums text-muted-foreground',
                      compact ? 'px-2' : 'px-3',
                    )}
                  >
                    {index + 1}
                  </td>
                  <td className={cn('py-2.5', compact ? 'max-w-0 px-2' : 'px-3')}>
                    <TeamBadge
                      name={standing.team?.nameEs ?? standing.teamName}
                      iso2={standing.team?.iso2}
                      flagEmoji={standing.team?.flagEmoji}
                      size="sm"
                      className={compact ? 'min-w-0' : undefined}
                    />
                  </td>
                  <td
                    className={cn(
                      'py-2.5 text-center tabular-nums',
                      compact ? 'hidden' : 'px-2',
                    )}
                  >
                    {standing.played}
                  </td>
                  {!compact && (
                    <>
                      <td className="px-2 py-2.5 text-center tabular-nums">{standing.won}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums">{standing.drawn}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums">{standing.lost}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums">{standing.goalsFor}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums">{standing.goalsAgainst}</td>
                    </>
                  )}
                  <td className={cn('py-2.5 text-center tabular-nums', compact ? 'px-1' : 'px-2')}>
                    {standing.goalDiff > 0 ? `+${standing.goalDiff}` : standing.goalDiff}
                  </td>
                  <td
                    className={cn(
                      'py-2.5 text-center font-medium tabular-nums text-primary',
                      compact ? 'px-1' : 'px-2',
                    )}
                  >
                    {standing.points}
                  </td>
                  {showR32 && (
                    <td className="px-1 py-2.5 text-center align-middle">
                      {r32Projections[index] ? (
                        <R32CompactBadge projection={r32Projections[index]} />
                      ) : null}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
