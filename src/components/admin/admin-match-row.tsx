'use client'

import { useTransition } from 'react'
import { Loader2, RefreshCw, Radio } from 'lucide-react'
import { toast } from 'sonner'

import { recalculateMatchPoints, setMatchLive } from '@/app/actions/admin'
import { AdminMatchPredictions } from '@/components/admin/admin-match-predictions'
import { Button } from '@/components/ui/button'
import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import { formatDbMatchKickoff } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { AdminPredictionView, MatchStatistics } from '@/lib/queries/admin'

interface TeamInfo {
  nameEs: string
  iso2: string
  flagEmoji: string
}

interface AdminMatchRowProps {
  match: {
    id: number
    date: string
    timeArg: string
    homeTeam: TeamInfo | null
    awayTeam: TeamInfo | null
    homeScore: number | null
    awayScore: number | null
    venue: { name: string }
    isTest?: boolean
  }
  action?: 'live' | 'recalculate'
  stats?: MatchStatistics
  predictions?: AdminPredictionView[]
  showHeader?: boolean
}

function TeamLabel({ team, fallback }: { team: TeamInfo | null; fallback: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {team ? (
        <FlagIcon iso2={team.iso2} flagEmoji={team.flagEmoji} size="sm" />
      ) : (
        <span className="flex size-5 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
          ?
        </span>
      )}
      <span className="truncate font-medium">{team?.nameEs ?? fallback}</span>
    </span>
  )
}

function StatBar({ label, value, total, colorClass }: { label: string; value: number; total: number; colorClass: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <span className={cn('block h-full rounded-full', colorClass)} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  )
}

export function AdminMatchRow({ match, action, stats, predictions, showHeader = true }: AdminMatchRowProps) {
  const [isPending, startTransition] = useTransition()

  function handleAction() {
    startTransition(async () => {
      const result =
        action === 'live' ? await setMatchLive(match.id) : await recalculateMatchPoints(match.id)
      if (result.ok) {
        toast.success(result.message)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              {formatDbMatchKickoff(new Date(match.date), match.timeArg)} · {match.venue.name}
              {match.isTest && (
                <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
                  Amistoso
                </span>
              )}
            </p>
            <div className="mt-1.5 flex items-center gap-3">
              <TeamLabel team={match.homeTeam} fallback="Local" />
              {match.homeScore != null && match.awayScore != null ? (
                <span className="font-heading text-lg tabular-nums text-primary">
                  {match.homeScore} - {match.awayScore}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">vs</span>
              )}
              <TeamLabel team={match.awayTeam} fallback="Visitante" />
            </div>
          </div>

          {action && (
            <Button
              type="button"
              variant={action === 'live' ? 'default' : 'outline'}
              size="sm"
              onClick={handleAction}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : action === 'live' ? (
                <Radio className="size-3.5" aria-hidden />
              ) : (
                <RefreshCw className="size-3.5" aria-hidden />
              )}
              {action === 'live' ? 'Marcar en juego' : 'Recalcular puntos'}
            </Button>
          )}
        </div>
      )}

      {!showHeader && action && (
        <div className="flex justify-end px-4 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAction}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-3.5" aria-hidden />
            )}
            Recalcular puntos
          </Button>
        </div>
      )}

      {stats && (
        <div className="space-y-0 border-t border-border/60 bg-muted/20">
          <div className="space-y-1.5 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">
              {stats.totalPredictions} predicciones · {stats.exactHits} acertaron el resultado exacto
            </p>
            {stats.totalPredictions > 0 && (
              <div className="grid gap-1">
                <StatBar
                  label={match.homeTeam?.nameEs ?? 'Local'}
                  value={stats.outcomeDistribution.home}
                  total={stats.totalPredictions}
                  colorClass="bg-brand-blue"
                />
                <StatBar
                  label="Empate"
                  value={stats.outcomeDistribution.draw}
                  total={stats.totalPredictions}
                  colorClass="bg-muted-foreground/50"
                />
                <StatBar
                  label={match.awayTeam?.nameEs ?? 'Visitante'}
                  value={stats.outcomeDistribution.away}
                  total={stats.totalPredictions}
                  colorClass="bg-brand-red"
                />
              </div>
            )}
          </div>
          <AdminMatchPredictions
            matchId={match.id}
            totalPredictions={stats.totalPredictions}
            initialPredictions={predictions}
          />
        </div>
      )}
    </article>
  )
}
