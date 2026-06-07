'use client'

import { useEffect, useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'

import { saveBracketMatchPrediction } from '@/app/actions/bracket'
import type { BracketSlotPrediction } from '@/lib/queries/bracket'
import {
  formatKnockoutPredictionNote,
  type KnockoutDecidedIn,
} from '@/lib/bracket/knockout-prediction'
import { MatchScoreboard } from '@/components/ui-mundial/match-scoreboard'
import { cn } from '@/lib/utils'

interface BracketMatchRowProps {
  matchId: number
  home: { name: string; iso2?: string; flagEmoji?: string }
  away: { name: string; iso2?: string; flagEmoji?: string }
  homeTeamId?: string
  awayTeamId?: string
  initialHome?: number | null
  initialAway?: number | null
  initialAdvancesTeamId?: string | null
  initialDecidedIn?: KnockoutDecidedIn | null
  editable?: boolean
  knockout?: boolean
  onSaved?: (prediction: BracketSlotPrediction) => void
  className?: string
}

export function BracketMatchRow({
  matchId,
  home,
  away,
  homeTeamId,
  awayTeamId,
  initialHome = null,
  initialAway = null,
  initialAdvancesTeamId = null,
  initialDecidedIn = null,
  editable = true,
  knockout = false,
  onSaved,
  className,
}: BracketMatchRowProps) {
  const [predHome, setPredHome] = useState<number | null>(initialHome)
  const [predAway, setPredAway] = useState<number | null>(initialAway)
  const [savedHome, setSavedHome] = useState<number | null>(initialHome)
  const [savedAway, setSavedAway] = useState<number | null>(initialAway)
  const [advancesTeamId, setAdvancesTeamId] = useState<string | null>(initialAdvancesTeamId)
  const [decidedIn, setDecidedIn] = useState<KnockoutDecidedIn | null>(initialDecidedIn)
  const [savedAdvancesTeamId, setSavedAdvancesTeamId] = useState<string | null>(
    initialAdvancesTeamId
  )
  const [savedDecidedIn, setSavedDecidedIn] = useState<KnockoutDecidedIn | null>(initialDecidedIn)
  const [isEditing, setIsEditing] = useState(editable && initialHome == null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setPredHome(initialHome)
    setPredAway(initialAway)
    setSavedHome(initialHome)
    setSavedAway(initialAway)
    setAdvancesTeamId(initialAdvancesTeamId)
    setDecidedIn(initialDecidedIn)
    setSavedAdvancesTeamId(initialAdvancesTeamId)
    setSavedDecidedIn(initialDecidedIn)
  }, [
    initialHome,
    initialAway,
    initialAdvancesTeamId,
    initialDecidedIn,
  ])

  const showInputs = editable && (savedHome == null || isEditing)
  const isDraw =
    knockout &&
    predHome != null &&
    predAway != null &&
    predHome === predAway &&
    homeTeamId &&
    awayTeamId

  const savedNote =
    knockout &&
    savedHome != null &&
    savedAway != null &&
    savedAdvancesTeamId &&
    homeTeamId &&
    awayTeamId
      ? formatKnockoutPredictionNote(
          savedHome,
          savedAway,
          savedDecidedIn,
          savedAdvancesTeamId === homeTeamId ? 'home' : 'away'
        )
      : null

  function handleSave() {
    if (predHome == null || predAway == null) {
      setError('Completá ambos resultados.')
      return
    }

    if (isDraw && (!advancesTeamId || !decidedIn || decidedIn === 'regulation')) {
      setError('Con empate en 90\' indicá quién avanza y si es prórroga o penales.')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await saveBracketMatchPrediction(
        matchId,
        predHome,
        predAway,
        knockout
          ? {
              advancesTeamId: isDraw ? advancesTeamId : undefined,
              decidedIn: isDraw ? decidedIn : 'regulation',
            }
          : undefined
      )
      if (result.ok) {
        setSavedHome(predHome)
        setSavedAway(predAway)
        setSavedAdvancesTeamId(isDraw ? advancesTeamId : null)
        setSavedDecidedIn(isDraw ? decidedIn : 'regulation')
        setIsEditing(false)
        onSaved?.({
          predHome,
          predAway,
          predAdvancesTeamId: isDraw ? advancesTeamId : null,
          predDecidedIn: isDraw ? decidedIn : 'regulation',
        })
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className={cn('rounded-lg border border-border/60 bg-card/50 p-3', className)}>
      <MatchScoreboard
        home={home}
        away={away}
        homeScore={showInputs ? predHome : savedHome}
        awayScore={showInputs ? predAway : savedAway}
        editable={showInputs}
        disabled={isPending}
        onHomeChange={setPredHome}
        onAwayChange={setPredAway}
      />

      {showInputs && isDraw && (
        <div className="mt-3 space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="text-xs font-medium text-muted-foreground">Empate en 90&apos; — ¿quién avanza?</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAdvancesTeamId(homeTeamId!)}
              className={cn(
                'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                advancesTeamId === homeTeamId
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {home.name}
            </button>
            <button
              type="button"
              onClick={() => setAdvancesTeamId(awayTeamId!)}
              className={cn(
                'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                advancesTeamId === awayTeamId
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {away.name}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['extra_time', 'Prórroga'],
                ['penalties', 'Penales'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setDecidedIn(value)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                  decidedIn === value
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!showInputs && savedNote && (
        <p className="mt-2 text-center text-xs text-muted-foreground">{savedNote}</p>
      )}

      {editable && (
        <div className="mt-2 flex items-center justify-end gap-2">
          {error && <p className="mr-auto text-xs text-destructive">{error}</p>}
          {showInputs ? (
            <>
              {savedHome != null && (
                <button
                  type="button"
                  onClick={() => {
                    setPredHome(savedHome)
                    setPredAway(savedAway)
                    setAdvancesTeamId(savedAdvancesTeamId)
                    setDecidedIn(savedDecidedIn)
                    setIsEditing(false)
                    setError(null)
                  }}
                  disabled={isPending}
                  className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending && <Loader2 className="size-3 animate-spin" aria-hidden />}
                Guardar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              Editar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
