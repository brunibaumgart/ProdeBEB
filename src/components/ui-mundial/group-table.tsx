import { TeamBadge } from '@/components/ui-mundial/team-badge'
import { cn } from '@/lib/utils'
import type { Standing } from '@/lib/bracket'

interface GroupTableProps {
  group: string
  standings: Standing[]
  compact?: boolean
  className?: string
}

export function GroupTable({ group, standings, compact = false, className }: GroupTableProps) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card', className)}>
      <div className="border-b border-border bg-muted/40 px-4 py-2">
        <h3 className="font-heading text-lg tracking-wide text-primary">GRUPO {group}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">Equipo</th>
              <th className="px-2 py-2 text-center font-medium">PJ</th>
              {!compact && (
                <>
                  <th className="px-2 py-2 text-center font-medium">PG</th>
                  <th className="px-2 py-2 text-center font-medium">PE</th>
                  <th className="px-2 py-2 text-center font-medium">PP</th>
                  <th className="px-2 py-2 text-center font-medium">GF</th>
                  <th className="px-2 py-2 text-center font-medium">GC</th>
                </>
              )}
              <th className="px-2 py-2 text-center font-medium">DG</th>
              <th className="px-2 py-2 text-center font-medium">Pts</th>
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
                  <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{index + 1}</td>
                  <td className="px-3 py-2.5">
                    <TeamBadge
                      name={standing.team?.nameEs ?? standing.teamName}
                      iso2={standing.team?.iso2}
                      flagEmoji={standing.team?.flagEmoji}
                      size="sm"
                    />
                  </td>
                  <td className="px-2 py-2.5 text-center tabular-nums">{standing.played}</td>
                  {!compact && (
                    <>
                      <td className="px-2 py-2.5 text-center tabular-nums">{standing.won}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums">{standing.drawn}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums">{standing.lost}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums">{standing.goalsFor}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums">{standing.goalsAgainst}</td>
                    </>
                  )}
                  <td className="px-2 py-2.5 text-center tabular-nums">
                    {standing.goalDiff > 0 ? `+${standing.goalDiff}` : standing.goalDiff}
                  </td>
                  <td className="px-2 py-2.5 text-center font-medium tabular-nums text-primary">
                    {standing.points}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
