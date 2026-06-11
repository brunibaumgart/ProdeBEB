'use client'

import { useMemo, useRef, useState } from 'react'
import { CircleDot, Lock, Trophy } from 'lucide-react'

import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import type { TournamentPredictionMatchView } from '@/lib/queries/tournament-predictions'
import {
  getTournamentPredictionRevealMessage,
  getTournamentPredictionRevealSummary,
} from '@/lib/tournament/predictions-visibility'
import { formatDbMatchKickoff } from '@/lib/time'
import { cn } from '@/lib/utils'

interface TournamentPredictionsViewProps {
  currentUserId: string
  matches: TournamentPredictionMatchView[]
}

type TabId = 'en-juego' | 'proximamente' | 'finalizados'

const TABS: { id: TabId; label: string }[] = [
  { id: 'en-juego', label: 'En juego' },
  { id: 'proximamente', label: 'Próximamente' },
  { id: 'finalizados', label: 'Finalizados' },
]

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
          ? match.isFinished
            ? ` · Resultado: ${match.homeScore}-${match.awayScore}`
            : ` · Marcador: ${match.homeScore}-${match.awayScore}`
          : match.canReveal && !match.isFinished
            ? ' · En juego'
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

function formatTotalPoints(points: number | null, pointsScorers: number | null) {
  const base = points ?? 0
  const scorers = pointsScorers ?? 0
  if (points == null && scorers === 0) return '—'
  if (scorers > 0) return `${base + scorers} pts (+${scorers}G)`
  return `${base} pts`
}

function matchSearchLabel(match: TournamentPredictionMatchView) {
  return `${match.homeTeam?.nameEs ?? ''} ${match.awayTeam?.nameEs ?? ''} #${match.id}`
}

function RevealedPredictionsChips({
  match,
  currentUserId,
}: {
  match: TournamentPredictionMatchView
  currentUserId: string
}) {
  if (match.predictions.length === 0) return null

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {match.predictions.map((prediction) => (
        <span
          key={prediction.id}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] tabular-nums',
            prediction.userId === currentUserId
              ? 'border-primary/40 bg-primary/10 font-medium text-foreground'
              : 'border-border/60 bg-muted/30 text-muted-foreground',
          )}
        >
          <span className="max-w-[72px] truncate">
            {prediction.userName.split(' ')[0]}
            {prediction.userId === currentUserId ? ' (vos)' : ''}
          </span>
          <span className="font-semibold">
            {prediction.predHome}-{prediction.predAway}
          </span>
        </span>
      ))}
    </div>
  )
}

function FinishedPointsChips({
  match,
  currentUserId,
}: {
  match: TournamentPredictionMatchView
  currentUserId: string
}) {
  if (match.predictions.length === 0) return null

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {match.predictions.map((prediction) => {
        const total = (prediction.points ?? 0) + (prediction.pointsScorers ?? 0)
        const hasPoints = prediction.points != null || (prediction.pointsScorers ?? 0) > 0

        return (
          <span
            key={prediction.id}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] tabular-nums',
              prediction.userId === currentUserId
                ? 'border-primary/40 bg-primary/10 font-medium text-foreground'
                : 'border-border/60 bg-muted/30 text-muted-foreground',
            )}
          >
            <span className="max-w-[72px] truncate">
              {prediction.userName.split(' ')[0]}
              {prediction.userId === currentUserId ? ' (vos)' : ''}
            </span>
            <span className={cn('font-semibold', getPointsClass(hasPoints ? total : null))}>
              {hasPoints ? formatTotalPoints(prediction.points, prediction.pointsScorers) : '—'}
            </span>
          </span>
        )
      })}
    </div>
  )
}

function MatchPredictionsTable({
  match,
  currentUserId,
}: {
  match: TournamentPredictionMatchView
  currentUserId: string
}) {
  if (!match.canReveal) {
    return (
      <p className="text-sm text-muted-foreground">
        {getTournamentPredictionRevealMessage(new Date(match.date), match.timeArg)}
      </p>
    )
  }

  if (match.predictions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nadie del torneo predijo este partido.</p>
    )
  }

  return (
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
                {prediction.scorerNames.length > 0 ? prediction.scorerNames.join(', ') : '—'}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                <span className={cn('font-medium', getPointsClass(prediction.points))}>
                  {prediction.points ?? '—'}
                </span>
                {(prediction.pointsScorers ?? 0) > 0 ? (
                  <span className="ml-1 text-xs text-brand-gold">+{prediction.pointsScorers}G</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MatchCard({
  match,
  currentUserId,
  expanded,
  onToggle,
  cardRef,
  alwaysExpanded = false,
}: {
  match: TournamentPredictionMatchView
  currentUserId: string
  expanded: boolean
  onToggle: () => void
  cardRef?: (node: HTMLElement | null) => void
  alwaysExpanded?: boolean
}) {
  const isOpen = alwaysExpanded || expanded
  const isInProgress = match.canReveal && !match.isFinished

  const headerContent = (
    <>
      <MatchHeader match={match} />
      <div className="shrink-0 text-right text-xs">
        {match.isFinished ? (
          <span className="inline-flex items-center gap-1 font-medium text-brand-green">
            <Trophy className="size-3.5" aria-hidden />
            Finalizado
          </span>
        ) : isInProgress ? (
          <span className="inline-flex items-center gap-1 font-medium text-brand-gold">
            <CircleDot className="size-3.5" aria-hidden />
            En juego
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Lock className="size-3.5" aria-hidden />
            Ocultas
          </span>
        )}
        <p className="mt-1 text-muted-foreground">
          {match.predictionCount} predicción{match.predictionCount === 1 ? '' : 'es'}
        </p>
      </div>
    </>
  )

  return (
    <article
      ref={cardRef}
      id={`tournament-match-${match.id}`}
      className="scroll-mt-24 overflow-hidden rounded-xl border border-border bg-card"
    >
      {alwaysExpanded ? (
        <div className="space-y-3 px-4 py-3">
          <div className="flex items-start justify-between gap-3">{headerContent}</div>
          {match.isFinished ? (
            <FinishedPointsChips match={match} currentUserId={currentUserId} />
          ) : isInProgress ? (
            <RevealedPredictionsChips match={match} currentUserId={currentUserId} />
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/20"
        >
          {headerContent}
        </button>
      )}

      {isOpen ? (
        <div className={cn('border-t border-border/60 px-4 py-4', alwaysExpanded && 'pt-0')}>
          <MatchPredictionsTable match={match} currentUserId={currentUserId} />
        </div>
      ) : null}
    </article>
  )
}

function QuickMatchNav({
  matches,
  activeMatchId,
  currentUserId,
  onSelect,
}: {
  matches: TournamentPredictionMatchView[]
  activeMatchId: number | null
  currentUserId: string
  onSelect: (matchId: number) => void
}) {
  if (matches.length <= 1) return null

  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 px-1 py-2">
      <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Ir al partido
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {matches.map((match) => {
          const isActive = activeMatchId === match.id
          const myPrediction = match.predictions.find(
            (prediction) => prediction.userId === currentUserId,
          )
          const myPoints =
            myPrediction && myPrediction.points != null
              ? myPrediction.points + (myPrediction.pointsScorers ?? 0)
              : null

          return (
            <button
              key={match.id}
              type="button"
              onClick={() => onSelect(match.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="text-[10px] opacity-60">M{match.id}</span>
              {match.homeTeam ? (
                <FlagIcon iso2={match.homeTeam.iso2} flagEmoji={match.homeTeam.flagEmoji} size="sm" />
              ) : null}
              <span className="text-muted-foreground">vs</span>
              {match.awayTeam ? (
                <FlagIcon iso2={match.awayTeam.iso2} flagEmoji={match.awayTeam.flagEmoji} size="sm" />
              ) : null}
              {!match.canReveal ? (
                <Lock className="size-3 opacity-50" aria-hidden />
              ) : match.isFinished && myPoints != null ? (
                <span className={cn('text-[10px] font-bold tabular-nums', getPointsClass(myPoints))}>
                  {myPoints}p
                </span>
              ) : match.canReveal && !match.isFinished && myPrediction ? (
                <span className="text-[10px] font-bold tabular-nums text-brand-gold">
                  {myPrediction.predHome}-{myPrediction.predAway}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function resolveDefaultTab(counts: Record<TabId, number>): TabId {
  if (counts['en-juego'] > 0) return 'en-juego'
  if (counts.proximamente > 0) return 'proximamente'
  return 'finalizados'
}

export function TournamentPredictionsView({
  currentUserId,
  matches,
}: TournamentPredictionsViewProps) {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('en-juego')
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null)
  const cardRefs = useRef(new Map<number, HTMLElement | null>())
  const normalizedQuery = query.trim().toLowerCase()

  const { upcomingMatches, finishedMatches, inProgressMatches } = useMemo(() => {
    const upcoming = matches.filter((match) => !match.canReveal)
    const finished = matches
      .filter((match) => match.isFinished)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const inProgress = matches
      .filter((match) => match.canReveal && !match.isFinished)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id)
    return { upcomingMatches: upcoming, finishedMatches: finished, inProgressMatches: inProgress }
  }, [matches])

  const filteredUpcoming = useMemo(() => {
    if (!normalizedQuery) return upcomingMatches
    return upcomingMatches.filter((match) =>
      matchSearchLabel(match).toLowerCase().includes(normalizedQuery),
    )
  }, [upcomingMatches, normalizedQuery])

  const filteredFinished = useMemo(() => {
    if (!normalizedQuery) return finishedMatches
    return finishedMatches.filter((match) =>
      matchSearchLabel(match).toLowerCase().includes(normalizedQuery),
    )
  }, [finishedMatches, normalizedQuery])

  const filteredInProgress = useMemo(() => {
    if (!normalizedQuery) return inProgressMatches
    return inProgressMatches.filter((match) =>
      matchSearchLabel(match).toLowerCase().includes(normalizedQuery),
    )
  }, [inProgressMatches, normalizedQuery])

  const tabCounts = useMemo(
    () => ({
      'en-juego': filteredInProgress.length,
      proximamente: filteredUpcoming.length,
      finalizados: filteredFinished.length,
    }),
    [filteredInProgress.length, filteredUpcoming.length, filteredFinished.length],
  )

  const preferredTab = resolveDefaultTab(tabCounts)
  const currentTab =
    tabCounts[activeTab] > 0 || Object.values(tabCounts).every((count) => count === 0)
      ? activeTab
      : preferredTab

  const activeMatches = useMemo(() => {
    switch (currentTab) {
      case 'en-juego':
        return filteredInProgress
      case 'proximamente':
        return filteredUpcoming
      case 'finalizados':
        return filteredFinished
    }
  }, [currentTab, filteredFinished, filteredInProgress, filteredUpcoming])

  const defaultExpandedId = activeMatches[0]?.id ?? null
  const activeExpandedId = expandedMatchId ?? defaultExpandedId
  const alwaysExpandedActiveTab = currentTab === 'en-juego' || currentTab === 'finalizados'

  function jumpToMatch(matchId: number) {
    setExpandedMatchId(matchId)
    requestAnimationFrame(() => {
      cardRefs.current.get(matchId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function handleTabChange(tab: TabId) {
    setActiveTab(tab)
    setExpandedMatchId(null)
  }

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
        <p>{getTournamentPredictionRevealSummary()}</p>
      </div>

      {matches.length > 4 ? (
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar partido…"
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      ) : null}

      <div
        className="flex gap-2 overflow-x-auto border-b border-border/60 pb-1"
        role="tablist"
        aria-label="Estado de los partidos"
      >
        {TABS.map(({ id, label }) => {
          const isActive = currentTab === id
          const count = tabCounts[id]

          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabChange(id)}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground',
              )}
            >
              {label}
              <span className="ml-1.5 text-xs opacity-70">({count})</span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel" className="space-y-3">
        {activeMatches.length > 0 ? (
          <>
            <QuickMatchNav
              matches={activeMatches}
              activeMatchId={activeExpandedId}
              currentUserId={currentUserId}
              onSelect={jumpToMatch}
            />
            {activeMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                currentUserId={currentUserId}
                expanded={alwaysExpandedActiveTab || activeExpandedId === match.id}
                onToggle={() =>
                  setExpandedMatchId(activeExpandedId === match.id ? null : match.id)
                }
                alwaysExpanded={alwaysExpandedActiveTab}
                cardRef={(node) => {
                  cardRefs.current.set(match.id, node)
                }}
              />
            ))}
          </>
        ) : (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {normalizedQuery
              ? 'Ningún partido coincide con la búsqueda en esta pestaña.'
              : 'No hay partidos en esta pestaña.'}
          </p>
        )}
      </div>
    </div>
  )
}
