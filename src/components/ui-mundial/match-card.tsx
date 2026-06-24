import Link from 'next/link'

import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import { FriendlyMatchBadge } from '@/components/ui-mundial/friendly-match-badge'
import { RoundLabel } from '@/components/ui-mundial/round-label'
import { friendlyMatchCardClass, isFriendlyMatch } from '@/lib/matches/friendly'
import { formatDbMatchKickoff } from '@/lib/time'
import type { MatchWithRelations } from '@/lib/queries/matches'
import { cn } from '@/lib/utils'

interface MatchCardProps {
  match: MatchWithRelations
  href?: string
  className?: string
  prediction?: { predHome: number; predAway: number } | null
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

export function MatchCard({ match, href, className, prediction }: MatchCardProps) {
  const isFinished = match.status === 'finished'
  const isLive = match.status === 'live'
  const friendly = isFriendlyMatch(match)

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
          team={match.homeTeam}
          score={isFinished || isLive ? match.homeScore : null}
        />
        <TeamRow
          label={match.awayLabel ?? 'Visitante'}
          team={match.awayTeam}
          score={isFinished || isLive ? match.awayScore : null}
        />
      </div>

      {prediction !== undefined && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
          <span className="font-semibold uppercase tracking-wide text-muted-foreground">
            Tu predicción
          </span>
          {prediction ? (
            <span className="font-heading text-sm tabular-nums text-primary">
              {prediction.predHome} - {prediction.predAway}
            </span>
          ) : (
            <span className="text-muted-foreground">Sin predicción</span>
          )}
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
