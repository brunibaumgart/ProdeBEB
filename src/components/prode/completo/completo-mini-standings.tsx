import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import type { Standing } from '@/lib/bracket'
import { cn } from '@/lib/utils'

export function CompletoMiniStandings({
  group,
  standings,
  orderOnly = false,
  className,
}: {
  group: string
  standings: Standing[]
  orderOnly?: boolean
  className?: string
}) {
  return (
    <div className={cn('rounded-lg border border-border/70 bg-card/80', className)}>
      <div className="border-b border-border/60 px-2 py-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Grupo {group}
        </p>
      </div>
      <ul className="divide-y divide-border/50">
        {standings.slice(0, 4).map((standing, index) => (
          <li
            key={standing.teamName}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1',
              index < 2 && 'bg-brand-green/5',
              index === 2 && 'bg-muted/20',
            )}
          >
            <span className="w-3 text-[10px] tabular-nums text-muted-foreground">{index + 1}</span>
            <FlagIcon
              iso2={standing.team?.iso2 ?? ''}
              flagEmoji={standing.team?.flagEmoji}
              size="sm"
            />
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
              {standing.team?.nameEs ?? standing.teamName}
            </span>
            {!orderOnly ? (
              <span className="text-[11px] font-semibold tabular-nums text-primary">
                {standing.points}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
