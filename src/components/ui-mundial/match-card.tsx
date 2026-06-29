import Link from 'next/link'

import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import { FriendlyMatchBadge } from '@/components/ui-mundial/friendly-match-badge'
import { RoundLabel } from '@/components/ui-mundial/round-label'
import { friendlyMatchCardClass, isFriendlyMatch } from '@/lib/matches/friendly'
import { formatDbMatchKickoff } from '@/lib/time'
import type { MatchWithRelations } from '@/lib/queries/matches'
import { cn } from '@/lib/utils'

type ConfirmedTeam = { nameEs: string; iso2: string; flagEmoji: string }

interface MatchCardProps {
  match: MatchWithRelations
  href?: string
  className?: string
  prediction?: PredictionInfo | null
  otherPrediction?: (PredictionInfo & { label: string }) | null
  /** Equipo local confirmado por resultados reales (cuando no está en la BD aún). */
  confirmedHomeTeam?: ConfirmedTeam | null
  /** Equipo visitante confirmado por resultados reales (cuando no está en la BD aún). */
  confirmedAwayTeam?: ConfirmedTeam | null
}

interface PredictionInfo {
  predHome: number
  predAway: number
  predPenaltiesWinnerId?: string | null
  points?: number | null
  pointsScorers?: number | null
}

function getTotalPoints(prediction: PredictionInfo): number | null {
  if (prediction.points == null) return null
  return prediction.points + (prediction.pointsScorers ?? 0)
}

function getPointsColor(points: number | null) {
  if (points == null) return 'text-muted-foreground'
  if (points >= 3) return 'text-brand-green'
  if (points >= 1) return 'text-brand-gold'
  return 'text-muted-foreground'
}

function TeamRow({
  label,
  team,
  score,
}: {
  label: string
  team?: { nameEs: string; iso2: string; flagEmoji: string } | null
  score: number | null
}) {
  return (
    <div className="flex items-center gap-2 text-left">
      {team ? (
        <FlagIcon iso2={team.iso2} flagEmoji={team.flagEmoji} size="sm" />
      ) : (
        <span className="flex size-5 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
          ?
        </span>
      )}
      <span className="min-w-0 flex-1 truncate font-medium">{team?.nameEs ?? label}</span>
      {score != null && (
        <span className="font-heading text-xl tabular-nums text-primary">{score}</span>
      )}
    </div>
  )
}

function resolvePenFlag(
  predPenaltiesWinnerId: string | null | undefined,
  match: { homeTeamId: string | null; awayTeamId: string | null; homeTeam: { flagEmoji: string } | null; awayTeam: { flagEmoji: string } | null },
): string | null {
  if (!predPenaltiesWinnerId) return null
  if (predPenaltiesWinnerId === match.homeTeamId) return match.homeTeam?.flagEmoji ?? null
  if (predPenaltiesWinnerId === match.awayTeamId) return match.awayTeam?.flagEmoji ?? null
  return null
}

export function MatchCard({
  match,
  href,
  className,
  prediction,
  otherPrediction,
  confirmedHomeTeam,
  confirmedAwayTeam,
}: MatchCardProps) {
  const isFinished = match.status === 'finished'
  const isLive = match.status === 'live'
  const friendly = isFriendlyMatch(match)
  const isKnockout = match.round !== 'Group Stage' && !match.isTest
  const effectiveHomeTeam = match.homeTeam ?? confirmedHomeTeam ?? null
  const effectiveAwayTeam = match.awayTeam ?? confirmedAwayTeam ?? null

  const content = (
    <article
      className={cn(
        'rounded-xl border p-4 transition-colors',
        friendlyMatchCardClass(friendly),
        href && !friendly && 'hover:border-primary/40 hover:bg-card/80',
        href && friendly && 'hover:border-violet-400/60 hover:bg-violet-950/30',
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {friendly ? <FriendlyMatchBadge /> : <RoundLabel round={match.round} variant="short" />}
        </div>
        <span>{formatDbMatchKickoff(match.date, match.timeArg)}</span>
      </div>

      <div className="space-y-2">
        <TeamRow
          label={match.homeLabel ?? 'Local'}
          team={effectiveHomeTeam}
          score={isFinished || isLive ? match.homeScore : null}
        />
        <TeamRow
          label={match.awayLabel ?? 'Visitante'}
          team={effectiveAwayTeam}
          score={isFinished || isLive ? match.awayScore : null}
        />
      </div>

      {prediction !== undefined && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
          <span className="font-semibold uppercase tracking-wide text-muted-foreground">
            Tu predicción
          </span>
          {prediction ? (
            <span className="flex items-center gap-2">
              <span className="font-heading text-sm tabular-nums text-primary">
                {prediction.predHome} - {prediction.predAway}
                {isKnockout && prediction.predHome === prediction.predAway && (() => {
                  const flag = resolvePenFlag(prediction.predPenaltiesWinnerId, match)
                  return flag ? <span className="ml-1 text-xs" title="Ganador por penales">{flag}</span> : null
                })()}
              </span>
              {isFinished && (
                <span className={cn('font-bold tabular-nums', getPointsColor(getTotalPoints(prediction)))}>
                  {getTotalPoints(prediction) != null ? `${getTotalPoints(prediction)} pts` : 'Pendiente'}
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">Sin predicción</span>
          )}
        </div>
      )}

      {otherPrediction && (
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2 text-xs">
          <span className="font-semibold uppercase tracking-wide text-muted-foreground">
            {otherPrediction.label}
          </span>
          <span className="flex items-center gap-2">
            <span className="font-heading text-sm tabular-nums text-brand-gold">
              {otherPrediction.predHome} - {otherPrediction.predAway}
              {isKnockout && otherPrediction.predHome === otherPrediction.predAway && (() => {
                const flag = resolvePenFlag(otherPrediction.predPenaltiesWinnerId, match)
                return flag ? <span className="ml-1 text-xs" title="Ganador por penales">{flag}</span> : null
              })()}
            </span>
            {isFinished && (
              <span
                className={cn('font-bold tabular-nums', getPointsColor(getTotalPoints(otherPrediction)))}
              >
                {getTotalPoints(otherPrediction) != null
                  ? `${getTotalPoints(otherPrediction)} pts`
                  : 'Pendiente'}
              </span>
            )}
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="truncate">{match.venue.name}</span>
        {isLive && (
          <span className="shrink-0 rounded-full bg-brand-red/20 px-2 py-0.5 font-medium text-brand-red">
            EN VIVO
          </span>
        )}
        {match.group && !isLive && !isFinished && (
          <span className="shrink-0 font-medium">Grupo {match.group}</span>
        )}
        {!match.group && !isLive && !isFinished && effectiveHomeTeam && effectiveAwayTeam && (
          <span className="shrink-0 rounded-full bg-brand-green/10 px-2 py-0.5 font-semibold text-brand-green">
            Cruce confirmado
          </span>
        )}
        {!match.group && !isLive && !isFinished && (effectiveHomeTeam || effectiveAwayTeam) && !(effectiveHomeTeam && effectiveAwayTeam) && (
          <span className="shrink-0 rounded-full bg-brand-gold/10 px-2 py-0.5 font-semibold text-brand-gold">
            Rival TBD
          </span>
        )}
      </div>
    </article>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }

  return content
}
