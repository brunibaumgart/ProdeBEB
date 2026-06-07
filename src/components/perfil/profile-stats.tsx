import { MatchScoreboard } from '@/components/ui-mundial/match-scoreboard'
import { cn } from '@/lib/utils'
import type { getUserProfileStats } from '@/lib/queries/users'

type RecentPrediction = Awaited<
  ReturnType<typeof getUserProfileStats>
>['recentPredictions'][number]

interface ProfileStatsProps {
  pointsMatchday: number
  pointsScorers: number
  pointsComplete: number
  pointsTotal: number
  predictionsCount: number
  hitRate: number
}

export function ProfileStats({
  pointsMatchday,
  pointsScorers,
  pointsComplete,
  pointsTotal,
  predictionsCount,
  hitRate,
}: ProfileStatsProps) {
  const stats = [
    { label: 'Pts Fecha a Fecha', value: pointsMatchday },
    { label: 'Pts Goleadores', value: pointsScorers },
    { label: 'Pts Completo', value: pointsComplete },
    { label: 'Pts Totales', value: pointsTotal, highlight: true },
    { label: 'Predicciones', value: predictionsCount },
    { label: '% Aciertos', value: `${hitRate}%` },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            'rounded-xl border border-border bg-card p-4 text-center',
            stat.highlight && 'border-primary/30 bg-primary/5'
          )}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {stat.label}
          </p>
          <p
            className={cn(
              'mt-1 font-heading text-3xl tabular-nums tracking-wide',
              stat.highlight ? 'text-primary' : 'text-foreground'
            )}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  )
}

function getMatchLabel(
  team: { nameEs: string; iso2: string; flagEmoji: string } | null,
  fallback: string | null
) {
  return team?.nameEs ?? fallback ?? 'Por definir'
}

function getPointsColor(points: number | null) {
  if (points == null) return 'text-muted-foreground'
  if (points >= 3) return 'text-brand-green'
  if (points >= 1) return 'text-brand-gold'
  return 'text-muted-foreground'
}

export function RecentPredictions({ predictions }: { predictions: RecentPrediction[] }) {
  if (predictions.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Todavía no hiciste predicciones. Andá a{' '}
        <a href="/prode" className="font-medium text-primary hover:underline">
          Prode
        </a>{' '}
        para empezar.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {predictions.map((prediction) => {
        const { match } = prediction
        const isFinished = match.status === 'finished'
        const homeName = getMatchLabel(match.homeTeam, match.homeLabel)
        const awayName = getMatchLabel(match.awayTeam, match.awayLabel)

        return (
          <article
            key={prediction.id}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
              <span>Partido #{match.id}</span>
              <div className="flex items-center gap-2">
                {(prediction.pointsScorers ?? 0) > 0 && (
                  <span className="font-bold tabular-nums text-brand-gold">
                    +{prediction.pointsScorers} goles
                  </span>
                )}
                <span
                  className={cn(
                    'font-bold tabular-nums',
                    getPointsColor(prediction.points)
                  )}
                >
                  {prediction.points != null ? `${prediction.points} pts` : 'Pendiente'}
                </span>
              </div>
            </div>

            <div className="p-4">
              <MatchScoreboard
                home={{
                  name: homeName,
                  iso2: match.homeTeam?.iso2,
                  flagEmoji: match.homeTeam?.flagEmoji,
                }}
                away={{
                  name: awayName,
                  iso2: match.awayTeam?.iso2,
                  flagEmoji: match.awayTeam?.flagEmoji,
                }}
                homeScore={prediction.predHome}
                awayScore={prediction.predAway}
                homeRealScore={match.homeScore}
                awayRealScore={match.awayScore}
                showReal={isFinished}
              />
            </div>
          </article>
        )
      })}
    </div>
  )
}
