'use client'

import { useMemo, useState } from 'react'

import { MatchPredictionCard } from '@/components/prode/match-prediction-card'
import type { GoalScorerPlayer } from '@/components/prode/goal-scorer-picker'
import { cn } from '@/lib/utils'
import { ROUND_LABELS, type MatchRound } from '@/types'

type SerializableMatch = {
  id: number
  date: string
  timeArg: string
  status: string
  round: string
  group: string | null
  homeTeamId: string | null
  awayTeamId: string | null
  homeTeam: { nameEs: string; iso2: string; flagEmoji: string } | null
  awayTeam: { nameEs: string; iso2: string; flagEmoji: string } | null
  homeLabel: string | null
  awayLabel: string | null
  homeScore: number | null
  awayScore: number | null
  venue: { name: string }
  isTest?: boolean
}

type SerializablePrediction = {
  predHome: number
  predAway: number
  predPenaltiesWinnerId?: string | null
  points: number | null
  pointsScorers?: number | null
  homeScorerIds?: string[]
  awayScorerIds?: string[]
}

interface FechaViewProps {
  upcomingSections: { key: string; label: string; matches: SerializableMatch[] }[]
  historySections: { key: string; label: string; matches: SerializableMatch[] }[]
  predictions: Record<number, SerializablePrediction>
  playersByTeamId: Record<string, GoalScorerPlayer[]>
  scorersEnabled?: boolean
  focusMatchId?: number | null
  autoOpenEdit?: boolean
}

function isMatchInSections(
  matchId: number | null | undefined,
  sections: FechaViewProps['upcomingSections'],
) {
  if (matchId == null) return false
  return sections.some((section) => section.matches.some((match) => match.id === matchId))
}

type PredictionFilter = 'all' | 'pending' | 'done'

export function FechaView({
  upcomingSections,
  historySections,
  predictions,
  playersByTeamId,
  scorersEnabled = true,
  focusMatchId = null,
  autoOpenEdit = false,
}: FechaViewProps) {
  const [showHistory, setShowHistory] = useState(() =>
    isMatchInSections(focusMatchId, historySections),
  )
  const [groupFilter, setGroupFilter] = useState('')
  const [roundFilter, setRoundFilter] = useState('')
  const [predictionFilter, setPredictionFilter] = useState<PredictionFilter>('all')

  const sourceSections = showHistory ? historySections : upcomingSections

  const availableGroups = useMemo(() => {
    const groups = new Set<string>()
    for (const section of sourceSections) {
      for (const match of section.matches) {
        if (match.group) groups.add(match.group)
      }
    }
    return [...groups].sort()
  }, [sourceSections])

  const availableRounds = useMemo(() => {
    const rounds = new Set<string>()
    for (const section of sourceSections) {
      for (const match of section.matches) {
        rounds.add(match.round)
      }
    }
    return [...rounds]
  }, [sourceSections])

  const filteredSections = useMemo(() => {
    return sourceSections
      .map((section) => ({
        ...section,
        matches: section.matches.filter((match) => {
          if (groupFilter && match.group !== groupFilter) return false
          if (roundFilter && match.round !== roundFilter) return false

          if (!showHistory && predictionFilter !== 'all') {
            const hasPrediction = predictions[match.id] != null
            if (predictionFilter === 'pending' && hasPrediction) return false
            if (predictionFilter === 'done' && !hasPrediction) return false
          }

          return true
        }),
      }))
      .filter((section) => section.matches.length > 0)
  }, [sourceSections, groupFilter, roundFilter, predictionFilter, predictions, showHistory])

  const hasActiveFilters = groupFilter !== '' || roundFilter !== '' || predictionFilter !== 'all'

  function clearFilters() {
    setGroupFilter('')
    setRoundFilter('')
    setPredictionFilter('all')
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setShowHistory(false)
            clearFilters()
          }}
          className={cn(
            'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
            !showHistory
              ? 'border-primary bg-primary/15 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground'
          )}
        >
          Por predecir
        </button>
        <button
          type="button"
          onClick={() => {
            setShowHistory(true)
            setPredictionFilter('all')
          }}
          className={cn(
            'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
            showHistory
              ? 'border-primary bg-primary/15 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground'
          )}
        >
          Historial
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <label className="flex min-w-[100px] flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted-foreground">Grupo</span>
          <select
            value={groupFilter}
            onChange={(event) => setGroupFilter(event.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="">Todos</option>
            {availableGroups.map((group) => (
              <option key={group} value={group}>
                Grupo {group}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[140px] flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted-foreground">Fase</span>
          <select
            value={roundFilter}
            onChange={(event) => setRoundFilter(event.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="">Todas</option>
            {availableRounds.map((round) => (
              <option key={round} value={round}>
                {ROUND_LABELS[round as MatchRound] ?? round}
              </option>
            ))}
          </select>
        </label>

        {!showHistory && (
          <label className="flex min-w-[120px] flex-col gap-1.5 text-sm">
            <span className="font-medium text-muted-foreground">Estado</span>
            <select
              value={predictionFilter}
              onChange={(event) => setPredictionFilter(event.target.value as PredictionFilter)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="all">Todos</option>
              <option value="pending">Sin predecir</option>
              <option value="done">Predichos</option>
            </select>
          </label>
        )}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="h-9 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Limpiar
          </button>
        )}
      </div>

      {filteredSections.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
          {hasActiveFilters
            ? 'No hay partidos con esos filtros.'
            : showHistory
              ? 'Todavía no tenés predicciones en partidos finalizados.'
              : 'No hay partidos disponibles para predecir ahora.'}
        </p>
      ) : (
        <div className="space-y-8">
          {filteredSections.map((section) => (
            <section key={section.key}>
              <h2 className="mb-3 font-heading text-xl tracking-wide text-primary">
                {section.label.toUpperCase()}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {section.matches.map((match) => (
                  <MatchPredictionCard
                    key={match.id}
                    match={{
                      ...match,
                      date: new Date(match.date),
                    }}
                    prediction={predictions[match.id] ?? null}
                    homePlayers={match.homeTeamId ? (playersByTeamId[match.homeTeamId] ?? []) : []}
                    awayPlayers={match.awayTeamId ? (playersByTeamId[match.awayTeamId] ?? []) : []}
                    scorersEnabled={scorersEnabled}
                    autoOpenEdit={autoOpenEdit && focusMatchId === match.id}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
