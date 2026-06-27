'use client'

import { useMemo, useState, useTransition, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

import { saveBracketMatchPrediction } from '@/app/actions/bracket'
import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import {
  decodeKnockoutWinnerTeamId,
  encodeKnockoutWinner,
} from '@/lib/bracket/match-outcome'
import {
  BRACKET_MATCH_PLACEMENTS,
  BRACKET_ROUND_COLUMNS,
  DESKTOP_FINAL_COLUMN,
  DESKTOP_MIRROR_GRID_COLUMNS,
  DESKTOP_MIRROR_GRID_ROWS,
  DESKTOP_MIRROR_HEADER_COLUMNS,
  getDesktopMirrorPlacement,
  KNOCKOUT_BRACKET_ROUNDS,
  KNOCKOUT_MOBILE_TAB_ROUNDS,
  KNOCKOUT_THIRD_PLACE_ROUND,
  getKnockoutBracketRoundIndex,
  getKnockoutRoundUnlockDeps,
  getPreviousRoundMatchIds,
  type KnockoutBracketRound,
} from '@/lib/bracket/knockout-bracket-layout'
import { isKnockoutRoundUnlocked } from '@/lib/bracket/predicted-bracket'
import type { ResolvedMatchTeams } from '@/lib/bracket/predicted-bracket'
import type { BracketSlotPrediction } from '@/lib/queries/bracket'
import { cn } from '@/lib/utils'

type BracketTeam = {
  id: string
  nameEs: string
  iso2: string
  flagEmoji: string
}

export type CelebrityKnockoutHint = {
  shortLabel: string
  winnerNameEs: string
  matchesUser: boolean
}

interface KnockoutBracketViewProps {
  teams: BracketTeam[]
  resolvedKnockout: Map<number, ResolvedMatchTeams>
  predictions: Record<number, BracketSlotPrediction>
  editable: boolean
  groupsComplete: boolean
  onPredictionSaved: (matchId: number, prediction: BracketSlotPrediction) => void
  persistMode?: 'server' | 'local'
  isMatchLocked?: (matchId: number) => boolean
  /** Vista compacta móvil: una pantalla, un cruce a la vez. */
  mobileFit?: boolean
  celebrityKnockoutHints?: Record<number, CelebrityKnockoutHint[]>
  /** Partidos donde ambos equipos ya están confirmados por resultados reales. */
  confirmedMatchIds?: Set<number>
}

function getRoundProgress(
  matchIds: number[],
  predictions: Record<number, BracketSlotPrediction>,
) {
  const done = matchIds.filter((id) => predictions[id] != null).length
  return { done, total: matchIds.length }
}

function TeamFlagButton({
  team,
  selected,
  dimmed,
  disabled,
  pending,
  onClick,
  dense,
}: {
  team: BracketTeam
  selected: boolean
  dimmed: boolean
  disabled: boolean
  pending: boolean
  onClick: () => void
  dense?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={onClick}
      title={team.nameEs}
      aria-label={`Elegir a ${team.nameEs}`}
      aria-pressed={selected}
      className={cn(
        'group relative flex w-full items-center transition-all',
        dense
          ? 'justify-center rounded-md border px-1 py-1.5'
          : 'gap-2 rounded-lg border px-2 py-2',
        selected
          ? 'border-primary bg-primary/15 ring-2 ring-primary/40'
          : 'border-border/70 bg-background/80 hover:border-primary/40 hover:bg-primary/5',
        dimmed && !selected && 'opacity-45',
        disabled && 'cursor-not-allowed opacity-60',
        pending && 'pointer-events-none opacity-70',
      )}
    >
      <FlagIcon iso2={team.iso2} flagEmoji={team.flagEmoji} size={dense ? 'sm' : 'md'} />
      {!dense && (
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-left text-xs font-medium',
            selected ? 'text-primary' : 'text-foreground',
          )}
        >
          {team.nameEs}
        </span>
      )}
      {pending && (
        <Loader2
          className={cn(
            'animate-spin text-primary',
            dense ? 'absolute right-0.5 top-0.5 size-3' : 'absolute right-2 size-3.5',
          )}
          aria-hidden
        />
      )}
    </button>
  )
}

function BracketMatchCard({
  matchId,
  homeTeam,
  awayTeam,
  winnerId,
  editable,
  pending,
  onPick,
  dense,
  celebrityHints,
  confirmed,
}: {
  matchId: number
  homeTeam: BracketTeam
  awayTeam: BracketTeam
  winnerId: string | null
  editable: boolean
  pending: boolean
  onPick: (teamId: string) => void
  dense?: boolean
  celebrityHints?: CelebrityKnockoutHint[]
  confirmed?: boolean
}) {
  const hasWinner = Boolean(winnerId)

  return (
    <div
      className={cn(
        'relative w-full rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm',
        dense ? 'p-1' : 'p-2',
        confirmed
          ? 'border-brand-green/40'
          : hasWinner
            ? 'border-primary/25'
            : 'border-border/60',
      )}
    >
      {!dense && (
        <div className="mb-1.5 flex items-center justify-center gap-1.5">
          <p className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            M{matchId}
          </p>
          {confirmed && (
            <span className="rounded-full bg-brand-green/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand-green">
              Real
            </span>
          )}
        </div>
      )}
      {dense && confirmed && (
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-brand-green/20 px-1 py-0.5 text-[8px] font-semibold text-brand-green">
            ✓
          </span>
        </div>
      )}
      <div className={cn(dense ? 'space-y-1' : 'space-y-1.5')}>
        <TeamFlagButton
          team={homeTeam}
          selected={winnerId === homeTeam.id}
          dimmed={hasWinner && winnerId !== homeTeam.id}
          disabled={!editable}
          pending={pending}
          onClick={() => onPick(homeTeam.id)}
          dense={dense}
        />
        <TeamFlagButton
          team={awayTeam}
          selected={winnerId === awayTeam.id}
          dimmed={hasWinner && winnerId !== awayTeam.id}
          disabled={!editable}
          pending={pending}
          onClick={() => onPick(awayTeam.id)}
          dense={dense}
        />
      </div>
      {celebrityHints && celebrityHints.length > 0 ? (
        <div className={cn('space-y-0.5', dense ? 'mt-1' : 'mt-1.5')}>
          {celebrityHints.map((hint) => (
            <p
              key={hint.shortLabel}
              className={cn(
                'text-center text-[9px] leading-tight',
                hint.matchesUser ? 'text-brand-green' : 'text-muted-foreground',
              )}
            >
              <span className="font-semibold">{hint.shortLabel}:</span> {hint.winnerNameEs}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function BracketConnector({
  rowSpan,
  direction = 'right',
}: {
  rowSpan: number
  direction?: 'left' | 'right'
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none relative hidden w-3 shrink-0 lg:block xl:w-4"
      style={{ gridRowEnd: `span ${rowSpan}` }}
    >
      {direction === 'right' ? (
        <>
          <div className="absolute inset-y-[12%] right-0 w-1/2 border-y border-r border-primary/25" />
          <div className="absolute left-1/2 top-1/2 h-px w-1/2 -translate-y-1/2 bg-primary/25" />
        </>
      ) : (
        <>
          <div className="absolute inset-y-[12%] left-0 w-1/2 border-y border-l border-primary/25" />
          <div className="absolute right-1/2 top-1/2 h-px w-1/2 -translate-y-1/2 bg-primary/25" />
        </>
      )}
    </div>
  )
}

export function KnockoutBracketView({
  teams,
  resolvedKnockout,
  predictions,
  editable,
  groupsComplete,
  onPredictionSaved,
  persistMode = 'server',
  isMatchLocked,
  mobileFit = false,
  celebrityKnockoutHints,
  confirmedMatchIds,
}: KnockoutBracketViewProps) {
  const [activeRoundIndex, setActiveRoundIndex] = useState(0)
  const [mobileMatchIndex, setMobileMatchIndex] = useState(0)
  const [pendingMatchId, setPendingMatchId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams])

  const placementsByRound = useMemo(() => {
    const map = new Map<string, typeof BRACKET_MATCH_PLACEMENTS>()
    for (const column of BRACKET_ROUND_COLUMNS) {
      map.set(
        column.round,
        BRACKET_MATCH_PLACEMENTS.filter((slot) => slot.round === column.round),
      )
    }
    return map
  }, [])

  useEffect(() => {
    setMobileMatchIndex(0)
  }, [activeRoundIndex])

  function advanceRoundIfComplete(
    roundIndex: number,
    nextPredictions: Record<number, BracketSlotPrediction>,
  ) {
    if (roundIndex < 0) return

    const round = KNOCKOUT_BRACKET_ROUNDS[roundIndex]
    const { done } = getRoundProgress(round.matchIds, nextPredictions)

    if (done === round.matchIds.length && roundIndex < KNOCKOUT_BRACKET_ROUNDS.length - 1) {
      setActiveRoundIndex(roundIndex + 1)
    }
  }

  function advanceMobileMatchIfNeeded(
    round: KnockoutBracketRound,
    matchId: number,
  ) {
    if (!mobileFit) return

    const matchIds = round.matchIds
    const currentIndex = matchIds.indexOf(matchId)
    if (currentIndex >= 0 && currentIndex < matchIds.length - 1) {
      setMobileMatchIndex(currentIndex + 1)
    }
  }

  function advanceMobileRoundIfComplete(
    round: KnockoutBracketRound,
    nextPredictions: Record<number, BracketSlotPrediction>,
  ) {
    if (!mobileFit) return

    const { done, total } = getRoundProgress(round.matchIds, nextPredictions)

    if (done === total) {
      const nextIndex = KNOCKOUT_MOBILE_TAB_ROUNDS.findIndex((entry) => entry.round === round.round)
      if (nextIndex >= 0 && nextIndex < KNOCKOUT_MOBILE_TAB_ROUNDS.length - 1) {
        setActiveRoundIndex(nextIndex + 1)
      }
    }
  }

  function pickWinner(
    matchId: number,
    homeTeamId: string,
    awayTeamId: string,
    teamId: string,
    roundIndex: number,
  ) {
    if (!editable || !groupsComplete || isMatchLocked?.(matchId)) return

    const current = predictions[matchId]
    const currentWinner = current
      ? decodeKnockoutWinnerTeamId(
          current.predHome,
          current.predAway,
          homeTeamId,
          awayTeamId,
          current.predAdvancesTeamId,
        )
      : null

    if (currentWinner === teamId) return

    setError(null)

    const { predHome, predAway } = encodeKnockoutWinner(teamId, homeTeamId)
    const prediction: BracketSlotPrediction = {
      predHome,
      predAway,
      predAdvancesTeamId: teamId,
      predDecidedIn: 'regulation',
    }

    if (persistMode === 'local') {
      onPredictionSaved(matchId, prediction)
      advanceRoundIfComplete(roundIndex, {
        ...predictions,
        [matchId]: prediction,
      })
      if (mobileFit) {
        const mobileRound = KNOCKOUT_MOBILE_TAB_ROUNDS[activeRoundIndex]
        advanceMobileMatchIfNeeded(mobileRound, matchId)
        advanceMobileRoundIfComplete(mobileRound, {
          ...predictions,
          [matchId]: prediction,
        })
      }
      return
    }

    setPendingMatchId(matchId)

    startTransition(async () => {
      const result = await saveBracketMatchPrediction(matchId, predHome, predAway, {
        advancesTeamId: teamId,
        decidedIn: 'regulation',
      })
      setPendingMatchId(null)

      if (!result.ok) {
        setError(result.error)
        return
      }

      onPredictionSaved(matchId, prediction)
      advanceRoundIfComplete(roundIndex, {
        ...predictions,
        [matchId]: prediction,
      })
      if (mobileFit) {
        const mobileRound = KNOCKOUT_MOBILE_TAB_ROUNDS[activeRoundIndex]
        advanceMobileMatchIfNeeded(mobileRound, matchId)
        advanceMobileRoundIfComplete(mobileRound, {
          ...predictions,
          [matchId]: prediction,
        })
      }
    })
  }

  function renderMatch(
    matchId: number,
    canPlay: boolean,
    roundIndex: number,
    dense?: boolean,
  ) {
    const resolved = resolvedKnockout.get(matchId)
    const homeTeam = resolved?.homeTeamId ? teamById.get(resolved.homeTeamId) : null
    const awayTeam = resolved?.awayTeamId ? teamById.get(resolved.awayTeamId) : null

    if (!homeTeam || !awayTeam) {
      return (
        <div
          className={cn(
            'flex w-full items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/15 text-center text-xs text-muted-foreground',
            dense ? 'min-h-[52px] px-1 py-2' : 'min-h-[88px] px-3 py-4',
          )}
        >
          {dense ? '—' : (
            <>
              M{matchId}
              <br />
              Por definir
            </>
          )}
        </div>
      )
    }

    const prediction = predictions[matchId]
    const winnerId = prediction
      ? decodeKnockoutWinnerTeamId(
          prediction.predHome,
          prediction.predAway,
          homeTeam.id,
          awayTeam.id,
          prediction.predAdvancesTeamId,
        )
      : null

    const locked = isMatchLocked?.(matchId) ?? false

    return (
      <BracketMatchCard
        matchId={matchId}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        winnerId={winnerId}
        editable={canPlay && !locked}
        pending={isPending && pendingMatchId === matchId}
        onPick={(teamId) => pickWinner(matchId, homeTeam.id, awayTeam.id, teamId, roundIndex)}
        dense={dense}
        celebrityHints={celebrityKnockoutHints?.[matchId]}
        confirmed={confirmedMatchIds?.has(matchId)}
      />
    )
  }

  const activeMobileRound = mobileFit
    ? KNOCKOUT_MOBILE_TAB_ROUNDS[activeRoundIndex]
    : null
  const activeRound = mobileFit
    ? activeMobileRound ?? KNOCKOUT_BRACKET_ROUNDS[0]
    : KNOCKOUT_BRACKET_ROUNDS[activeRoundIndex]
  const activeBracketRoundIndex = getKnockoutBracketRoundIndex(activeRound)
  const activeUnlocked = isKnockoutRoundUnlocked(
    activeRound.matchIds,
    getKnockoutRoundUnlockDeps(activeRound),
    predictions,
  )
  const activeCanPlay = editable && groupsComplete && activeUnlocked

  const thirdPlaceUnlocked = isKnockoutRoundUnlocked(
    KNOCKOUT_THIRD_PLACE_ROUND.matchIds,
    [101, 102],
    predictions,
  )

  const roundIndexByMatchId = useMemo(() => {
    const map = new Map<number, number>()
    KNOCKOUT_BRACKET_ROUNDS.forEach((round, index) => {
      for (const id of round.matchIds) map.set(id, index)
    })
    return map
  }, [])

  function renderMobileRoundMatches() {
    const slots = placementsByRound.get(activeRound.round) ?? []
    const leftSlots = slots.filter((slot) => slot.half === 'left')
    const rightSlots = slots.filter((slot) => slot.half === 'right')

    if (rightSlots.length === 0) {
      return (
        <div className="mx-auto grid max-w-xs gap-3">
          {slots.map((slot) => (
            <div key={slot.matchId}>
              {renderMatch(slot.matchId, activeCanPlay, activeRoundIndex)}
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Mitad → Semi M101
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {leftSlots.map((slot) => (
              <div key={slot.matchId}>
                {renderMatch(slot.matchId, activeCanPlay, activeRoundIndex)}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Mitad → Semi M102
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {rightSlots.map((slot) => (
              <div key={slot.matchId}>
                {renderMatch(slot.matchId, activeCanPlay, activeRoundIndex)}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', mobileFit && 'flex min-h-0 flex-1 flex-col gap-2 space-y-0')}>
      {!mobileFit && (
        <p className="text-sm text-muted-foreground">
          Tocá la bandera del ganador en cada cruce. La llave sigue el cuadro oficial: equipos del
          mismo grupo quedan en mitades opuestas (1.º vs 2.º solo pueden verse en la final).
        </p>
      )}

      {!groupsComplete && !mobileFit && (
        <p className="rounded-lg border border-brand-gold/30 bg-brand-gold/10 px-4 py-3 text-sm">
          Completá la fase de grupos para desbloquear la llave.
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Mobile / tablet */}
      <div className={cn('space-y-4', mobileFit ? 'flex min-h-0 flex-1 flex-col gap-2' : 'lg:hidden')}>
        {mobileFit ? (
          <>
            {!groupsComplete && (
              <p className="shrink-0 rounded-lg border border-brand-gold/30 bg-brand-gold/10 px-3 py-2 text-xs">
                Completá grupos para desbloquear la llave.
              </p>
            )}

            <div className="grid shrink-0 grid-cols-3 gap-1">
              {KNOCKOUT_MOBILE_TAB_ROUNDS.map((round, roundIndex) => {
                const progress = getRoundProgress(round.matchIds, predictions)
                const isActive = activeRoundIndex === roundIndex

                return (
                  <button
                    key={round.round}
                    type="button"
                    onClick={() => setActiveRoundIndex(roundIndex)}
                    className={cn(
                      'rounded-md border py-1.5 text-center text-[10px] font-semibold transition-colors',
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground',
                      progress.done === progress.total &&
                        progress.total > 0 &&
                        !isActive &&
                        'border-brand-green/50 text-brand-green',
                    )}
                  >
                    {round.shortLabel}
                    <span className="mt-0.5 block text-[9px] font-normal opacity-80">
                      {progress.done}/{progress.total}
                    </span>
                  </button>
                )
              })}
            </div>

            {error && <p className="shrink-0 text-xs text-destructive">{error}</p>}

            <div className="flex min-h-0 flex-1 flex-col justify-center">
              {(() => {
                const matchIds = activeRound.matchIds
                const matchId = matchIds[mobileMatchIndex] ?? matchIds[0]
                if (!matchId) return null

                return (
                  <>
                    <div className="flex-1 content-center">
                      {renderMatch(
                        matchId,
                        activeRound.round === '3rd Place'
                          ? editable && groupsComplete && thirdPlaceUnlocked
                          : activeCanPlay,
                        activeBracketRoundIndex,
                      )}
                    </div>
                    {matchIds.length > 1 && (
                      <div className="mt-2 flex shrink-0 items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setMobileMatchIndex((index) => Math.max(0, index - 1))}
                          disabled={mobileMatchIndex === 0}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card disabled:opacity-40"
                          aria-label="Cruce anterior"
                        >
                          <ChevronLeft className="size-4" aria-hidden />
                        </button>
                        <div className="flex flex-1 items-center justify-center gap-1">
                          {matchIds.map((id, index) => (
                            <span
                              key={id}
                              className={cn(
                                'size-1.5 rounded-full',
                                index === mobileMatchIndex
                                  ? 'bg-primary'
                                  : predictions[id]
                                    ? 'bg-brand-green'
                                    : 'bg-muted-foreground/30',
                              )}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setMobileMatchIndex((index) =>
                              Math.min(matchIds.length - 1, index + 1),
                            )
                          }
                          disabled={mobileMatchIndex >= matchIds.length - 1}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card disabled:opacity-40"
                          aria-label="Cruce siguiente"
                        >
                          <ChevronRight className="size-4" aria-hidden />
                        </button>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </>
        ) : (
          <>
        <div className="flex flex-wrap gap-1.5">
          {KNOCKOUT_BRACKET_ROUNDS.map((round, roundIndex) => {
            const progress = getRoundProgress(round.matchIds, predictions)
            const unlocked = isKnockoutRoundUnlocked(
              round.matchIds,
              getPreviousRoundMatchIds(roundIndex),
              predictions,
            )
            const isActive = activeRoundIndex === roundIndex

            return (
              <button
                key={round.round}
                type="button"
                onClick={() => setActiveRoundIndex(roundIndex)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground',
                  progress.done === progress.total &&
                    progress.total > 0 &&
                    'border-brand-green/40',
                  !groupsComplete && 'opacity-60',
                  groupsComplete && !unlocked && !isActive && 'opacity-50',
                )}
              >
                {round.shortLabel}{' '}
                <span className="opacity-70">
                  ({progress.done}/{progress.total})
                </span>
              </button>
            )
          })}
        </div>

        <div>
          <p className="mb-3 font-heading text-base tracking-wide text-primary">
            {activeRound.label}
          </p>
          {renderMobileRoundMatches()}
        </div>
          </>
        )}
      </div>

      {/* Desktop: árbol espejado (mitades convergen al centro) */}
      <div className="hidden overflow-x-auto lg:block">
        <div className="mb-3 grid min-w-[72rem] grid-cols-[1fr_auto_1fr] gap-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>← Mitad izquierda</span>
          <span className="px-2 text-primary">Final</span>
          <span>Mitad derecha →</span>
        </div>

        <div className="mb-2 grid min-w-[72rem] gap-x-1 text-center xl:gap-x-2" style={{ gridTemplateColumns: DESKTOP_MIRROR_GRID_COLUMNS }}>
          {DESKTOP_MIRROR_HEADER_COLUMNS.map((header) => (
            <div
              key={`${header.column}-${header.shortLabel}`}
              className={cn(
                'font-heading text-[10px] tracking-wide text-primary xl:text-xs',
                header.column === DESKTOP_FINAL_COLUMN && 'font-semibold',
              )}
              style={{ gridColumn: header.column }}
            >
              {header.shortLabel}
            </div>
          ))}
        </div>

        <div
          className="grid min-w-[72rem] gap-x-1 xl:gap-x-2"
          style={{
            gridTemplateRows: `repeat(${DESKTOP_MIRROR_GRID_ROWS}, minmax(2.5rem, auto))`,
            gridTemplateColumns: DESKTOP_MIRROR_GRID_COLUMNS,
          }}
        >
          {BRACKET_MATCH_PLACEMENTS.map((slot) => {
            const placement = getDesktopMirrorPlacement(slot.matchId)
            if (!placement) return null

            const roundIndex = roundIndexByMatchId.get(slot.matchId) ?? 0
            const unlocked = isKnockoutRoundUnlocked(
              KNOCKOUT_BRACKET_ROUNDS[roundIndex]?.matchIds ?? [],
              getPreviousRoundMatchIds(roundIndex),
              predictions,
            )
            const canPlayRound = editable && groupsComplete && unlocked

            return (
              <div key={slot.matchId} className="contents">
                <div
                  className={cn(
                    'relative flex items-center px-0.5',
                    slot.half === 'left' && slot.round === 'Round of 32' && 'bg-primary/[0.02]',
                    slot.half === 'right' && slot.round === 'Round of 32' && 'bg-brand-gold/[0.03]',
                  )}
                  style={{
                    gridColumn: placement.matchColumn,
                    gridRow: `${placement.row} / span ${placement.rowSpan}`,
                  }}
                >
                  {renderMatch(slot.matchId, canPlayRound, roundIndex, true)}
                </div>

                {placement.connectorColumn != null ? (
                  <div
                    className="flex items-center"
                    style={{
                      gridColumn: placement.connectorColumn,
                      gridRow: `${placement.row} / span ${placement.rowSpan}`,
                    }}
                  >
                    <BracketConnector
                      rowSpan={placement.rowSpan}
                      direction={placement.connectorDirection}
                    />
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      {!mobileFit && (
        <div className="mx-auto max-w-xs">
          <div className="mb-2 text-center">
            <p className="font-heading text-sm tracking-wide text-muted-foreground">
              {KNOCKOUT_THIRD_PLACE_ROUND.label.toUpperCase()}
            </p>
          </div>
          {renderMatch(
            KNOCKOUT_THIRD_PLACE_ROUND.matchIds[0],
            editable && groupsComplete && thirdPlaceUnlocked,
            -1,
          )}
        </div>
      )}
    </div>
  )
}
