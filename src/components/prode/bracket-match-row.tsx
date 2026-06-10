'use client'

import { useEffect, useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'

import { saveBracketMatchPrediction } from '@/app/actions/bracket'
import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import {
  decodeKnockoutWinnerTeamId,
  encodeKnockoutWinner,
  formatGroupOutcomeLabel,
  outcomeToScores,
  scoresToGroupOutcome,
  type GroupMatchOutcome,
} from '@/lib/bracket/match-outcome'
import { formatKnockoutPredictionNote } from '@/lib/bracket/knockout-prediction'
import type { BracketSlotPrediction } from '@/lib/queries/bracket'
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
  editable?: boolean
  knockout?: boolean
  onSaved?: (prediction: BracketSlotPrediction) => void
  className?: string
}

function OutcomeButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary/15 text-primary'
          : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {children}
    </button>
  )
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
  editable = true,
  knockout = false,
  onSaved,
  className,
}: BracketMatchRowProps) {
  const initialGroupOutcome =
    initialHome != null && initialAway != null
      ? scoresToGroupOutcome(initialHome, initialAway)
      : null
  const initialKnockoutWinner =
    knockout && homeTeamId && awayTeamId && initialHome != null && initialAway != null
      ? decodeKnockoutWinnerTeamId(
          initialHome,
          initialAway,
          homeTeamId,
          awayTeamId,
          initialAdvancesTeamId,
        )
      : null

  const [groupOutcome, setGroupOutcome] = useState<GroupMatchOutcome | null>(initialGroupOutcome)
  const [savedGroupOutcome, setSavedGroupOutcome] = useState<GroupMatchOutcome | null>(
    initialGroupOutcome,
  )
  const [knockoutWinnerId, setKnockoutWinnerId] = useState<string | null>(initialKnockoutWinner)
  const [savedKnockoutWinnerId, setSavedKnockoutWinnerId] = useState<string | null>(
    initialKnockoutWinner,
  )
  const [isEditing, setIsEditing] = useState(
    editable && (knockout ? initialKnockoutWinner == null : initialGroupOutcome == null),
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const nextGroupOutcome =
      initialHome != null && initialAway != null
        ? scoresToGroupOutcome(initialHome, initialAway)
        : null
    const nextKnockoutWinner =
      knockout && homeTeamId && awayTeamId && initialHome != null && initialAway != null
        ? decodeKnockoutWinnerTeamId(
            initialHome,
            initialAway,
            homeTeamId,
            awayTeamId,
            initialAdvancesTeamId,
          )
        : null

    setGroupOutcome(nextGroupOutcome)
    setSavedGroupOutcome(nextGroupOutcome)
    setKnockoutWinnerId(nextKnockoutWinner)
    setSavedKnockoutWinnerId(nextKnockoutWinner)
  }, [initialHome, initialAway, initialAdvancesTeamId, homeTeamId, awayTeamId, knockout])

  const hasSaved = knockout ? savedKnockoutWinnerId != null : savedGroupOutcome != null
  const showInputs = editable && (!hasSaved || isEditing)

  const savedKnockoutName =
    savedKnockoutWinnerId && homeTeamId && awayTeamId
      ? savedKnockoutWinnerId === homeTeamId
        ? home.name
        : away.name
      : null

  function handleSave() {
    if (knockout) {
      if (!knockoutWinnerId || !homeTeamId || !awayTeamId) {
        setError('Elegí qué selección avanza.')
        return
      }

      const { predHome, predAway } = encodeKnockoutWinner(knockoutWinnerId, homeTeamId)

      setError(null)
      startTransition(async () => {
        const result = await saveBracketMatchPrediction(matchId, predHome, predAway, {
          advancesTeamId: knockoutWinnerId,
          decidedIn: 'regulation',
        })
        if (result.ok) {
          setSavedKnockoutWinnerId(knockoutWinnerId)
          setIsEditing(false)
          onSaved?.({
            predHome,
            predAway,
            predAdvancesTeamId: knockoutWinnerId,
            predDecidedIn: 'regulation',
          })
        } else {
          setError(result.error)
        }
      })
      return
    }

    if (!groupOutcome) {
      setError('Elegí victoria local, empate o victoria visitante.')
      return
    }

    const { predHome, predAway } = outcomeToScores(groupOutcome)

    setError(null)
    startTransition(async () => {
      const result = await saveBracketMatchPrediction(matchId, predHome, predAway)
      if (result.ok) {
        setSavedGroupOutcome(groupOutcome)
        setIsEditing(false)
        onSaved?.({ predHome, predAway })
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className={cn('rounded-lg border border-border/60 bg-card/50 p-3', className)}>
      <div className="mb-3 flex items-center justify-between gap-2 text-sm font-medium">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          {home.iso2 ? <FlagIcon iso2={home.iso2} flagEmoji={home.flagEmoji} size="sm" /> : null}
          <span className="truncate">{home.name}</span>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">vs</span>
        <span className="inline-flex min-w-0 items-center justify-end gap-1.5">
          <span className="truncate text-right">{away.name}</span>
          {away.iso2 ? <FlagIcon iso2={away.iso2} flagEmoji={away.flagEmoji} size="sm" /> : null}
        </span>
      </div>

      {showInputs ? (
        <div className="space-y-2">
          {knockout && homeTeamId && awayTeamId ? (
            <>
              <OutcomeButton
                active={knockoutWinnerId === homeTeamId}
                disabled={isPending}
                onClick={() => setKnockoutWinnerId(homeTeamId)}
              >
                Avanza {home.name}
              </OutcomeButton>
              <OutcomeButton
                active={knockoutWinnerId === awayTeamId}
                disabled={isPending}
                onClick={() => setKnockoutWinnerId(awayTeamId)}
              >
                Avanza {away.name}
              </OutcomeButton>
            </>
          ) : (
            <>
              <OutcomeButton
                active={groupOutcome === 'home_win'}
                disabled={isPending}
                onClick={() => setGroupOutcome('home_win')}
              >
                Victoria {home.name}
              </OutcomeButton>
              <OutcomeButton
                active={groupOutcome === 'draw'}
                disabled={isPending}
                onClick={() => setGroupOutcome('draw')}
              >
                Empate
              </OutcomeButton>
              <OutcomeButton
                active={groupOutcome === 'away_win'}
                disabled={isPending}
                onClick={() => setGroupOutcome('away_win')}
              >
                Victoria {away.name}
              </OutcomeButton>
            </>
          )}
        </div>
      ) : (
        <p className="rounded-lg bg-muted/30 px-3 py-2 text-center text-sm font-medium text-foreground">
          {knockout && savedKnockoutName
            ? formatKnockoutPredictionNote(savedKnockoutName)
            : savedGroupOutcome
              ? formatGroupOutcomeLabel(savedGroupOutcome, home.name, away.name)
              : 'Sin predicción'}
        </p>
      )}

      {editable && (
        <div className="mt-2 flex items-center justify-end gap-2">
          {error && <p className="mr-auto text-xs text-destructive">{error}</p>}
          {showInputs ? (
            <>
              {hasSaved && (
                <button
                  type="button"
                  onClick={() => {
                    setGroupOutcome(savedGroupOutcome)
                    setKnockoutWinnerId(savedKnockoutWinnerId)
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
