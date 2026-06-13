import Link from 'next/link'
import { Lock, Pencil, Trophy } from 'lucide-react'

import { MatchScoreboard } from '@/components/ui-mundial/match-scoreboard'
import type {
  MatchPredictionsContext,
  TournamentMatchPredictionsGroup,
} from '@/lib/queries/match-predictions-context'
import { getTournamentPredictionRevealMessage } from '@/lib/queries/match-predictions-context'
import type { MatchWithRelations } from '@/lib/queries/matches'
import { cn } from '@/lib/utils'

interface MatchPredictionsPanelProps {
  match: Pick<
    MatchWithRelations,
    'id' | 'date' | 'timeArg' | 'status' | 'homeScore' | 'awayScore' | 'homeTeam' | 'awayTeam' | 'homeLabel' | 'awayLabel'
  >
  context: MatchPredictionsContext
  canEditPrediction: boolean
}

function getFechaEditHref(matchId: number) {
  return `/prode/fecha?match=${matchId}&edit=1`
}

function getTeamSide(match: MatchPredictionsPanelProps['match']) {
  const home = {
    name: match.homeTeam?.nameEs ?? match.homeLabel ?? 'Local',
    iso2: match.homeTeam?.iso2,
    flagEmoji: match.homeTeam?.flagEmoji,
  }
  const away = {
    name: match.awayTeam?.nameEs ?? match.awayLabel ?? 'Visitante',
    iso2: match.awayTeam?.iso2,
    flagEmoji: match.awayTeam?.flagEmoji,
  }
  return { home, away }
}

function getPointsClass(points: number | null) {
  if (points == null) return 'text-muted-foreground'
  if (points >= 3) return 'text-brand-green'
  if (points >= 1) return 'text-brand-gold'
  return 'text-muted-foreground'
}

function TournamentPredictionsBlock({
  group,
  match,
}: {
  group: TournamentMatchPredictionsGroup
  match: MatchPredictionsPanelProps['match']
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 shrink-0 text-brand-gold" aria-hidden />
          <h3 className="font-medium text-foreground">{group.tournamentName}</h3>
        </div>
        <Link
          href={`/torneos/${group.tournamentId}/predicciones`}
          className="text-xs font-medium text-primary hover:underline"
        >
          Ver torneo
        </Link>
      </div>

      {!group.canReveal ? (
        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{getTournamentPredictionRevealMessage(match.date, match.timeArg)}</span>
          </p>
          {group.predictionCount > 0 ? (
            <p className="pl-6 text-xs">
              {group.predictionCount} miembro{group.predictionCount === 1 ? '' : 's'} ya cargó
              predicción.
            </p>
          ) : null}
        </div>
      ) : group.predictions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nadie más del torneo predijo este partido.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[480px] w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2 text-left font-medium">Miembro</th>
                <th className="px-2 py-2 text-center font-medium">Predicción</th>
                <th className="px-2 py-2 text-left font-medium">Goleadores</th>
                {match.status === 'finished' ? (
                  <th className="px-2 py-2 text-right font-medium">Pts</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {group.predictions.map((prediction) => (
                <tr key={prediction.id} className="border-b border-border/40 last:border-0">
                  <td className="px-2 py-2 font-medium">{prediction.userName}</td>
                  <td className="px-2 py-2 text-center font-heading text-base tabular-nums">
                    {prediction.predHome} - {prediction.predAway}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {prediction.scorerNames.length > 0 ? prediction.scorerNames.join(', ') : '—'}
                  </td>
                  {match.status === 'finished' ? (
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
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function MatchPredictionsPanel({
  match,
  context,
  canEditPrediction,
}: MatchPredictionsPanelProps) {
  const { home, away } = getTeamSide(match)
  const isFinished = match.status === 'finished'
  const userPrediction = context.userPrediction

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-lg tracking-wide">TU PREDICCIÓN FECHA A FECHA</h2>
          {canEditPrediction ? (
            <Link
              href={getFechaEditHref(match.id)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Pencil className="size-3.5" aria-hidden />
              Editar
            </Link>
          ) : null}
        </div>

        {userPrediction ? (
          <div className="space-y-3">
            <MatchScoreboard
              home={home}
              away={away}
              homeScore={userPrediction.predHome}
              awayScore={userPrediction.predAway}
            />
            {userPrediction.scorerNames.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Goleadores:</span>{' '}
                {userPrediction.scorerNames.join(', ')}
              </p>
            ) : null}
            {isFinished ? (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className={cn('font-bold tabular-nums', getPointsClass(userPrediction.points))}>
                  {userPrediction.points != null ? `${userPrediction.points} pts resultado` : 'Pendiente'}
                </span>
                {(userPrediction.pointsScorers ?? 0) > 0 ? (
                  <span className="font-bold tabular-nums text-brand-gold">
                    +{userPrediction.pointsScorers} goleadores
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
              Todavía no cargaste predicción para este partido.
            </p>
            {canEditPrediction ? (
              <Link
                href={getFechaEditHref(match.id)}
                className="inline-flex text-sm font-medium text-primary hover:underline"
              >
                Cargar en Fecha a Fecha
              </Link>
            ) : null}
          </div>
        )}
      </section>

      {context.tournaments.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="font-heading text-lg tracking-wide">TORNEOS PRIVADOS</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Predicciones de la gente con la que compartís torneo, agrupadas por grupo.
            </p>
          </div>

          {context.tournaments.map((group) => (
            <TournamentPredictionsBlock key={group.tournamentId} group={group} match={match} />
          ))}
        </section>
      ) : null}
    </div>
  )
}
