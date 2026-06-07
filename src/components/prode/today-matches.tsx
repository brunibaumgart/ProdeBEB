import Link from 'next/link'

import { MatchScoreboard } from '@/components/ui-mundial/match-scoreboard'
import { FriendlyMatchBadge } from '@/components/ui-mundial/friendly-match-badge'
import { RoundLabel } from '@/components/ui-mundial/round-label'
import {
  friendlyMatchCardClass,
  isFriendlyMatch,
} from '@/lib/matches/friendly'
import type { UserMatchPredictionSummary } from '@/lib/queries/predictions'
import type { MatchWithRelations } from '@/lib/queries/matches'
import { formatDbMatchKickoff } from '@/lib/time'
import { cn } from '@/lib/utils'

interface TodayMatchesProps {
  matches: MatchWithRelations[]
  predictionsByMatchId: Map<number, UserMatchPredictionSummary>
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

export function TodayMatches({ matches, predictionsByMatchId }: TodayMatchesProps) {
  if (matches.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No hay partidos hoy. Andá a{' '}
        <Link href="/prode/fecha" className="font-medium text-primary hover:underline">
          Fecha a Fecha
        </Link>{' '}
        para ver el fixture.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => {
        const prediction = predictionsByMatchId.get(match.id)
        const isFinished = match.status === 'finished'
        const homeName = getMatchLabel(match.homeTeam, match.homeLabel)
        const awayName = getMatchLabel(match.awayTeam, match.awayLabel)
        const home = {
          name: homeName,
          iso2: match.homeTeam?.iso2,
          flagEmoji: match.homeTeam?.flagEmoji,
        }
        const away = {
          name: awayName,
          iso2: match.awayTeam?.iso2,
          flagEmoji: match.awayTeam?.flagEmoji,
        }

        return (
          <article
            key={match.id}
            className={cn('overflow-hidden rounded-xl border', friendlyMatchCardClass(isFriendlyMatch(match)))}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                {isFriendlyMatch(match) ? (
                  <FriendlyMatchBadge />
                ) : (
                  <RoundLabel round={match.round} variant="short" />
                )}
                {match.group && (
                  <span className="rounded-full bg-background px-2 py-0.5 font-medium">
                    Grupo {match.group}
                  </span>
                )}
                <span>{formatDbMatchKickoff(match.date, match.timeArg)}</span>
              </div>
              {isFinished && prediction && (
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
              )}
            </div>

            <div className="space-y-3 p-4">
              {isFinished && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Resultado
                  </p>
                  <MatchScoreboard
                    home={home}
                    away={away}
                    homeScore={match.homeScore}
                    awayScore={match.awayScore}
                  />
                </div>
              )}

              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Tu predicción
                </p>
                {prediction ? (
                  <MatchScoreboard
                    home={home}
                    away={away}
                    homeScore={prediction.predHome}
                    awayScore={prediction.predAway}
                  />
                ) : (
                  <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
                    Sin predicción
                  </p>
                )}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
