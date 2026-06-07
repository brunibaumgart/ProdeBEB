'use client'

import { useMemo, useState } from 'react'
import { Eye, Lock } from 'lucide-react'

import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import type { TournamentPredictionMatchView } from '@/lib/queries/tournament-predictions'
import { getTournamentPredictionRevealMessage } from '@/lib/tournament/predictions-visibility'
import { formatDbMatchKickoff } from '@/lib/time'
import { cn } from '@/lib/utils'

interface TournamentPredictionsViewProps {
  currentUserId: string
  matches: TournamentPredictionMatchView[]
}

function MatchHeader({ match }: { match: TournamentPredictionMatchView }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2 font-medium">
        <span className="inline-flex items-center gap-1">
          {match.homeTeam ? (
            <FlagIcon iso2={match.homeTeam.iso2} flagEmoji={match.homeTeam.flagEmoji} size="sm" />
          ) : null}
          {match.homeTeam?.nameEs ?? 'Local'}
        </span>
        <span className="text-muted-foreground">vs</span>
        <span className="inline-flex items-center gap-1">
          {match.awayTeam ? (
            <FlagIcon iso2={match.awayTeam.iso2} flagEmoji={match.awayTeam.flagEmoji} size="sm" />
          ) : null}
          {match.awayTeam?.nameEs ?? 'Visitante'}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        #{match.id} · {formatDbMatchKickoff(new Date(match.date), match.timeArg)}
        {match.homeScore != null && match.awayScore != null
          ? ` · Resultado: ${match.homeScore}-${match.awayScore}`
          : ''}
      </p>
    </div>
  )
}

function getPointsClass(points: number | null) {
  if (points == null) return 'text-muted-foreground'
  if (points >= 3) return 'text-brand-green'
  if (points >= 1) return 'text-brand-gold'
  return 'text-muted-foreground'
}

export function TournamentPredictionsView({
  currentUserId,
  matches,
}: TournamentPredictionsViewProps) {
  const [query, setQuery] = useState('')
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(
    matches.find((match) => match.canReveal)?.id ?? null,
  )

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return matches
    return matches.filter((match) => {
      const label = `${match.homeTeam?.nameEs ?? ''} ${match.awayTeam?.nameEs ?? ''} #${match.id}`
      return label.toLowerCase().includes(normalized)
    })
  }, [matches, query])

  const revealedCount = matches.filter((match) => match.canReveal).length
  const hiddenCount = matches.length - revealedCount

  if (matches.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        Todavía nadie del torneo cargó predicciones de Fecha a Fecha.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <p>
          Las predicciones del grupo se revelan al horario programado del partido, no cuando el admin
          lo marca en vivo.
        </p>
        <p className="mt-2">
          {revealedCount} partido{revealedCount === 1 ? '' : 's'} revelado{revealedCount === 1 ? '' : 's'}
          {hiddenCount > 0
            ? ` · ${hiddenCount} pendiente${hiddenCount === 1 ? '' : 's'} de inicio`
            : ''}
        </p>
      </div>

      {matches.length > 6 ? (
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar partido…"
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      ) : null}

      <div className="space-y-3">
        {filtered.map((match) => {
          const expanded = expandedMatchId === match.id
          return (
            <article key={match.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <button
                type="button"
                onClick={() => setExpandedMatchId(expanded ? null : match.id)}
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/20"
              >
                <MatchHeader match={match} />
                <div className="shrink-0 text-right text-xs">
                  <p className="font-medium text-foreground">
                    {match.predictionCount} predicción{match.predictionCount === 1 ? '' : 'es'}
                  </p>
                  {match.canReveal ? (
                    <span className="mt-1 inline-flex items-center gap-1 text-brand-green">
                      <Eye className="size-3.5" aria-hidden />
                      Reveladas
                    </span>
                  ) : (
                    <span className="mt-1 inline-flex items-center gap-1 text-muted-foreground">
                      <Lock className="size-3.5" aria-hidden />
                      Ocultas
                    </span>
                  )}
                </div>
              </button>

              {expanded ? (
                <div className="border-t border-border/60 px-4 py-4">
                  {match.canReveal ? (
                    match.predictions.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-[480px] w-full text-sm">
                          <thead>
                            <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
                              <th className="px-2 py-2 text-left font-medium">Miembro</th>
                              <th className="px-2 py-2 text-center font-medium">Predicción</th>
                              <th className="px-2 py-2 text-left font-medium">Goleadores</th>
                              <th className="px-2 py-2 text-right font-medium">Pts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {match.predictions.map((prediction) => (
                              <tr
                                key={prediction.id}
                                className={cn(
                                  'border-b border-border/40 last:border-0',
                                  prediction.userId === currentUserId && 'bg-primary/5',
                                )}
                              >
                                <td className="px-2 py-2 font-medium">
                                  {prediction.userName}
                                  {prediction.userId === currentUserId ? (
                                    <span className="ml-1 text-xs text-muted-foreground">(vos)</span>
                                  ) : null}
                                </td>
                                <td className="px-2 py-2 text-center font-heading text-base tabular-nums">
                                  {prediction.predHome} - {prediction.predAway}
                                </td>
                                <td className="px-2 py-2 text-muted-foreground">
                                  {prediction.scorerNames.length > 0
                                    ? prediction.scorerNames.join(', ')
                                    : '—'}
                                </td>
                                <td className="px-2 py-2 text-right tabular-nums">
                                  <span className={cn('font-medium', getPointsClass(prediction.points))}>
                                    {prediction.points ?? '—'}
                                  </span>
                                  {(prediction.pointsScorers ?? 0) > 0 ? (
                                    <span className="ml-1 text-xs text-brand-gold">
                                      +{prediction.pointsScorers}G
                                    </span>
                                  ) : null}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nadie del torneo predijo este partido.
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {getTournamentPredictionRevealMessage(new Date(match.date), match.timeArg)}
                    </p>
                  )}
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </div>
  )
}
