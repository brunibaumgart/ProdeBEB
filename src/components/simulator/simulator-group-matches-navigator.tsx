'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { SimulatorMatchRow } from '@/components/simulator/simulator-match-row'
import { Button } from '@/components/ui/button'
import type { GroupMatchOutcome } from '@/lib/bracket/match-outcome'
import type { BracketSlotPrediction } from '@/lib/queries/bracket'
import { cn } from '@/lib/utils'

export type SimulatorGroupMatchItem = {
  id: number
  status: string
  homeScore: number | null
  awayScore: number | null
  home: { name: string; iso2: string; flagEmoji: string }
  away: { name: string; iso2: string; flagEmoji: string }
  prediction: BracketSlotPrediction | undefined
}

interface SimulatorGroupMatchesNavigatorProps {
  group: string
  matches: SimulatorGroupMatchItem[]
  matchIndex: number
  onMatchIndexChange: (index: number) => void
  onOutcomeChange: (matchId: number, outcome: GroupMatchOutcome | null) => void
  onScoreChange: (matchId: number, home: number | null, away: number | null) => void
  className?: string
}

export function SimulatorGroupMatchesNavigator({
  group,
  matches,
  matchIndex,
  onMatchIndexChange,
  onOutcomeChange,
  onScoreChange,
  className,
}: SimulatorGroupMatchesNavigatorProps) {
  if (matches.length === 0) {
    return (
      <p className={cn('rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground', className)}>
        No hay partidos en el Grupo {group}.
      </p>
    )
  }

  const safeIndex = Math.min(Math.max(matchIndex, 0), matches.length - 1)
  const match = matches[safeIndex]
  const hasPrev = safeIndex > 0
  const hasNext = safeIndex < matches.length - 1

  const simulatedCount = matches.filter(
    (entry) => entry.prediction?.predHome != null && entry.prediction?.predAway != null,
  ).length

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0"
          disabled={!hasPrev}
          onClick={() => onMatchIndexChange(safeIndex - 1)}
          aria-label="Partido anterior"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Button>

        <div className="min-w-0 flex-1 text-center">
          <p className="text-xs font-medium text-muted-foreground">
            Partido {safeIndex + 1} de {matches.length}
            <span className="mx-1.5 text-border">·</span>
            M{match.id}
          </p>
          <p className="truncate text-sm font-medium text-foreground">
            {match.home.name} vs {match.away.name}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {simulatedCount}/{matches.length} simulados en Grupo {group}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0"
          disabled={!hasNext}
          onClick={() => onMatchIndexChange(safeIndex + 1)}
          aria-label="Partido siguiente"
        >
          <ChevronRight className="size-5" aria-hidden />
        </Button>
      </div>

      <div className="flex justify-center gap-1.5" role="tablist" aria-label="Partidos del grupo">
        {matches.map((entry, index) => {
          const isActive = index === safeIndex
          const isDone =
            entry.prediction?.predHome != null && entry.prediction?.predAway != null

          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Partido ${index + 1}, M${entry.id}`}
              onClick={() => onMatchIndexChange(index)}
              className={cn(
                'size-2 rounded-full transition-colors',
                isActive
                  ? 'bg-primary ring-2 ring-primary/30 ring-offset-2 ring-offset-background'
                  : isDone
                    ? 'bg-brand-green/70'
                    : 'bg-muted-foreground/30',
              )}
            />
          )
        })}
      </div>

      <SimulatorMatchRow
        key={match.id}
        matchId={match.id}
        status={match.status}
        homeScore={match.homeScore}
        awayScore={match.awayScore}
        home={match.home}
        away={match.away}
        simulatedHome={match.prediction?.predHome ?? null}
        simulatedAway={match.prediction?.predAway ?? null}
        onOutcomeChange={onOutcomeChange}
        onScoreChange={onScoreChange}
      />
    </div>
  )
}
