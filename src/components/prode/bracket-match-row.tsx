'use client'

import { useEffect, useState, useTransition } from 'react'
import { Hash, ListOrdered, Loader2 } from 'lucide-react'

import { saveBracketMatchPrediction } from '@/app/actions/bracket'
import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import { ScoreInput } from '@/components/ui-mundial/score-input'
import { Button } from '@/components/ui/button'
import {
  decodeKnockoutWinnerTeamId,
  encodeKnockoutWinner,
  formatGroupPredictionLabel,
  isCanonicalGroupOutcomeScore,
  outcomeToScores,
  scoresToGroupOutcome,
  type GroupMatchOutcome,
} from '@/lib/bracket/match-outcome'
import { formatKnockoutPredictionNote } from '@/lib/bracket/knockout-prediction'
import type { BracketSlotPrediction } from '@/lib/queries/bracket'
import { cn } from '@/lib/utils'

type InputMode = 'outcome' | 'exact'

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
  variant?: 'default' | 'mobile'
  onSaved?: (prediction: BracketSlotPrediction) => void
  className?: string
}

function resolveInitialInputMode(
  knockout: boolean,
  initialHome: number | null,
  initialAway: number | null,
): InputMode {
  if (knockout) return 'outcome'
  if (
    initialHome != null &&
    initialAway != null &&
    !isCanonicalGroupOutcomeScore(initialHome, initialAway)
  ) {
    return 'exact'
  }
  return 'outcome'
}

function GroupOutcomePickButton({
  active,
  disabled,
  pending,
  onClick,
  label,
  children,
  className,
}: {
  active: boolean
  disabled?: boolean
  pending?: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'relative flex flex-1 flex-col items-center justify-center rounded-xl border py-2.5 transition-all',
        active
          ? 'border-primary bg-primary/15 ring-2 ring-primary/40'
          : 'border-border/70 bg-background/80 hover:border-primary/40 hover:bg-primary/5',
        (disabled || pending) && 'cursor-not-allowed opacity-60',
        pending && 'pointer-events-none',
        className,
      )}
    >
      {children}
      {pending && active && (
        <Loader2 className="absolute right-1 top-1 size-3 animate-spin text-primary" aria-hidden />
      )}
    </button>
  )
}

function KnockoutFlagPickButton({
  team,
  selected,
  dimmed,
  disabled,
  pending,
  onClick,
  compact,
}: {
  team: { name: string; iso2?: string; flagEmoji?: string }
  selected: boolean
  dimmed: boolean
  disabled?: boolean
  pending?: boolean
  onClick: () => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={onClick}
      title={team.name}
      aria-label={`Elegir a ${team.name}`}
      aria-pressed={selected}
      className={cn(
        'group relative flex w-full items-center transition-all',
        compact
          ? 'justify-center rounded-md border px-1 py-2'
          : 'gap-2 rounded-lg border px-2 py-2',
        selected
          ? 'border-primary bg-primary/15 ring-2 ring-primary/40'
          : 'border-border/70 bg-background/80 hover:border-primary/40 hover:bg-primary/5',
        dimmed && !selected && 'opacity-45',
        disabled && 'cursor-not-allowed opacity-60',
        pending && 'pointer-events-none opacity-70',
      )}
    >
      {team.iso2 ? (
        <FlagIcon iso2={team.iso2} flagEmoji={team.flagEmoji} size={compact ? 'sm' : 'md'} />
      ) : (
        <span className="text-xs font-medium">{team.name.slice(0, 3)}</span>
      )}
      {!compact && (
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-left text-xs font-medium',
            selected ? 'text-primary' : 'text-foreground',
          )}
        >
          {team.name}
        </span>
      )}
      {pending && selected && (
        <Loader2
          className={cn(
            'animate-spin text-primary',
            compact ? 'absolute right-0.5 top-0.5 size-3' : 'absolute right-2 size-3.5',
          )}
          aria-hidden
        />
      )}
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
  variant = 'default',
  onSaved,
  className,
}: BracketMatchRowProps) {
  const isMobile = variant === 'mobile'
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

  const [predHome, setPredHome] = useState<number | null>(initialHome)
  const [predAway, setPredAway] = useState<number | null>(initialAway)
  const [savedPredHome, setSavedPredHome] = useState<number | null>(initialHome)
  const [savedPredAway, setSavedPredAway] = useState<number | null>(initialAway)
  const [inputMode, setInputMode] = useState<InputMode>(() =>
    resolveInitialInputMode(knockout, initialHome, initialAway),
  )
  const [knockoutWinnerId, setKnockoutWinnerId] = useState<string | null>(initialKnockoutWinner)
  const [savedKnockoutWinnerId, setSavedKnockoutWinnerId] = useState<string | null>(
    initialKnockoutWinner,
  )
  const [isEditing, setIsEditing] = useState(
    editable &&
      (knockout
        ? initialKnockoutWinner == null
        : initialHome == null || initialAway == null),
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
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

    setPredHome(initialHome)
    setPredAway(initialAway)
    setSavedPredHome(initialHome)
    setSavedPredAway(initialAway)
    setKnockoutWinnerId(nextKnockoutWinner)
    setSavedKnockoutWinnerId(nextKnockoutWinner)
    setInputMode(resolveInitialInputMode(knockout, initialHome, initialAway))
  }, [initialHome, initialAway, initialAdvancesTeamId, homeTeamId, awayTeamId, knockout])

  const hasSaved = knockout
    ? savedKnockoutWinnerId != null
    : savedPredHome != null && savedPredAway != null
  const showInputs = editable && (!hasSaved || isEditing || isMobile)

  const activeOutcome =
    predHome != null && predAway != null ? scoresToGroupOutcome(predHome, predAway) : null

  const savedKnockoutName =
    savedKnockoutWinnerId && homeTeamId && awayTeamId
      ? savedKnockoutWinnerId === homeTeamId
        ? home.name
        : away.name
      : null

  const savedGroupLabel =
    savedPredHome != null && savedPredAway != null
      ? formatGroupPredictionLabel(savedPredHome, savedPredAway, home.name, away.name)
      : null

  function handleSaveKnockout(nextWinnerId?: string | null) {
    const winnerId = nextWinnerId ?? knockoutWinnerId
    if (!winnerId || !homeTeamId || !awayTeamId) {
      setError('Elegí qué selección avanza.')
      return
    }

    const { predHome: nextHome, predAway: nextAway } = encodeKnockoutWinner(winnerId, homeTeamId)

    setError(null)
    startTransition(async () => {
      const result = await saveBracketMatchPrediction(matchId, nextHome, nextAway, {
        advancesTeamId: winnerId,
        decidedIn: 'regulation',
      })
      if (result.ok) {
        setSavedKnockoutWinnerId(winnerId)
        setIsEditing(false)
        onSaved?.({
          predHome: nextHome,
          predAway: nextAway,
          predAdvancesTeamId: winnerId,
          predDecidedIn: 'regulation',
        })
      } else {
        setError(result.error)
      }
    })
  }

  function handleSaveGroupScores(nextHome?: number | null, nextAway?: number | null) {
    const homeScore = nextHome ?? predHome
    const awayScore = nextAway ?? predAway

    if (homeScore == null || awayScore == null) {
      setError('Completá el marcador o elegí un resultado.')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await saveBracketMatchPrediction(matchId, homeScore, awayScore)
      if (result.ok) {
        setSavedPredHome(homeScore)
        setSavedPredAway(awayScore)
        setPredHome(homeScore)
        setPredAway(awayScore)
        setIsEditing(false)
        onSaved?.({ predHome: homeScore, predAway: awayScore })
      } else {
        setError(result.error)
      }
    })
  }

  function pickGroupOutcome(outcome: GroupMatchOutcome) {
    const { predHome: nextHome, predAway: nextAway } = outcomeToScores(outcome)
    setPredHome(nextHome)
    setPredAway(nextAway)
    if (isMobile && editable) {
      handleSaveGroupScores(nextHome, nextAway)
    }
  }

  function pickKnockoutWinner(teamId: string) {
    setKnockoutWinnerId(teamId)
    if (isMobile && editable) {
      handleSaveKnockout(teamId)
    }
  }

  function handleExactScoreChange(side: 'home' | 'away', value: number | null) {
    const nextHome = side === 'home' ? value : predHome
    const nextAway = side === 'away' ? value : predAway
    setPredHome(nextHome)
    setPredAway(nextAway)

    if (isMobile && editable && nextHome != null && nextAway != null) {
      handleSaveGroupScores(nextHome, nextAway)
    }
  }

  function handleModeToggle() {
    if (!editable || knockout) return

    if (inputMode === 'outcome') {
      setInputMode('exact')
      if (predHome == null && predAway == null) {
        setPredHome(0)
        setPredAway(0)
      }
      return
    }

    setInputMode('outcome')
  }

  function resetDraft() {
    setPredHome(savedPredHome)
    setPredAway(savedPredAway)
    setKnockoutWinnerId(savedKnockoutWinnerId)
    setInputMode(
      savedPredHome != null && savedPredAway != null
        ? resolveInitialInputMode(false, savedPredHome, savedPredAway)
        : 'outcome',
    )
    setIsEditing(false)
    setError(null)
  }

  const hasKnockoutWinner = Boolean(knockoutWinnerId)

  return (
    <div
      className={cn(
        'rounded-lg border border-border/60 bg-card/50',
        isMobile ? 'flex flex-col justify-center p-2.5' : 'p-3',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-2 font-medium',
          isMobile ? 'mb-2 text-xs' : 'mb-3 text-sm',
        )}
      >
        <span className="min-w-0 flex-1 truncate text-center">{home.name}</span>
        <span className="shrink-0 text-[10px] text-muted-foreground">vs</span>
        <span className="min-w-0 flex-1 truncate text-center">{away.name}</span>
      </div>

      {showInputs ? (
        knockout && homeTeamId && awayTeamId ? (
          <div className={cn('space-y-1.5', isMobile && 'space-y-1')}>
            <KnockoutFlagPickButton
              team={home}
              selected={knockoutWinnerId === homeTeamId}
              dimmed={hasKnockoutWinner && knockoutWinnerId !== homeTeamId}
              disabled={!editable}
              pending={isPending}
              onClick={() => pickKnockoutWinner(homeTeamId)}
              compact={isMobile}
            />
            <KnockoutFlagPickButton
              team={away}
              selected={knockoutWinnerId === awayTeamId}
              dimmed={hasKnockoutWinner && knockoutWinnerId !== awayTeamId}
              disabled={!editable}
              pending={isPending}
              onClick={() => pickKnockoutWinner(awayTeamId)}
              compact={isMobile}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {!knockout && (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleModeToggle}
                  className="rounded-full px-2.5"
                  title={inputMode === 'outcome' ? 'Usar marcador exacto' : 'Usar bandera / empate'}
                >
                  {inputMode === 'outcome' ? (
                    <>
                      <Hash aria-hidden />
                      Exacto
                    </>
                  ) : (
                    <>
                      <ListOrdered aria-hidden />
                      Banderas
                    </>
                  )}
                </Button>
              </div>
            )}

            {inputMode === 'exact' ? (
              <div className="flex items-center justify-center gap-3">
                <ScoreInput
                  label={home.name}
                  hideLabel={isMobile}
                  value={predHome}
                  onChange={(value) => handleExactScoreChange('home', value)}
                  disabled={isPending}
                  className={isMobile ? 'scale-90' : undefined}
                />
                <span className="pt-4 text-sm font-medium text-muted-foreground">–</span>
                <ScoreInput
                  label={away.name}
                  hideLabel={isMobile}
                  value={predAway}
                  onChange={(value) => handleExactScoreChange('away', value)}
                  disabled={isPending}
                  className={isMobile ? 'scale-90' : undefined}
                />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                <GroupOutcomePickButton
                  active={activeOutcome === 'home_win'}
                  disabled={!editable}
                  pending={isPending}
                  onClick={() => pickGroupOutcome('home_win')}
                  label={`Victoria ${home.name}`}
                >
                  {home.iso2 ? (
                    <FlagIcon iso2={home.iso2} flagEmoji={home.flagEmoji} size="md" />
                  ) : (
                    <span className="text-xs font-semibold">L</span>
                  )}
                </GroupOutcomePickButton>
                <GroupOutcomePickButton
                  active={activeOutcome === 'draw'}
                  disabled={!editable}
                  pending={isPending}
                  onClick={() => pickGroupOutcome('draw')}
                  label="Empate"
                >
                  <span className="text-lg font-bold leading-none text-muted-foreground">=</span>
                </GroupOutcomePickButton>
                <GroupOutcomePickButton
                  active={activeOutcome === 'away_win'}
                  disabled={!editable}
                  pending={isPending}
                  onClick={() => pickGroupOutcome('away_win')}
                  label={`Victoria ${away.name}`}
                >
                  {away.iso2 ? (
                    <FlagIcon iso2={away.iso2} flagEmoji={away.flagEmoji} size="md" />
                  ) : (
                    <span className="text-xs font-semibold">V</span>
                  )}
                </GroupOutcomePickButton>
              </div>
            )}
          </div>
        )
      ) : (
        <p
          className={cn(
            'rounded-lg bg-muted/30 text-center font-medium text-foreground',
            isMobile ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm',
          )}
        >
          {knockout && savedKnockoutName ? (
            <span className="inline-flex items-center justify-center gap-1.5">
              {savedKnockoutWinnerId === homeTeamId && home.iso2 ? (
                <FlagIcon iso2={home.iso2} flagEmoji={home.flagEmoji} size="sm" />
              ) : savedKnockoutWinnerId === awayTeamId && away.iso2 ? (
                <FlagIcon iso2={away.iso2} flagEmoji={away.flagEmoji} size="sm" />
              ) : null}
              {formatKnockoutPredictionNote(savedKnockoutName)}
            </span>
          ) : savedGroupLabel ? (
            <>
              {savedGroupLabel.title}
              {savedGroupLabel.subtitle ? (
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  {savedGroupLabel.subtitle}
                </span>
              ) : null}
            </>
          ) : (
            'Sin predicción'
          )}
        </p>
      )}

      {editable && !isMobile && (
        <div className="mt-2 flex items-center justify-end gap-2">
          {error && <p className="mr-auto text-xs text-destructive">{error}</p>}
          {showInputs ? (
            <>
              {hasSaved && (
                <button
                  type="button"
                  onClick={resetDraft}
                  disabled={isPending}
                  className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
              )}
              <button
                type="button"
                onClick={() => (knockout ? handleSaveKnockout() : handleSaveGroupScores())}
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

      {isMobile && isPending && (
        <p className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
          <Loader2 className="size-3 animate-spin" aria-hidden />
          Guardando…
        </p>
      )}

      {isMobile && error && (
        <p className="mt-1 text-center text-[10px] text-destructive">{error}</p>
      )}
    </div>
  )
}
