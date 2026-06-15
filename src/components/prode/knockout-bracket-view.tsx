'use client'

import { useMemo, useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'

import { saveBracketMatchPrediction } from '@/app/actions/bracket'
import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import {
  decodeKnockoutWinnerTeamId,
  encodeKnockoutWinner,
} from '@/lib/bracket/match-outcome'
import {
  BRACKET_GRID_ROWS,
  BRACKET_MATCH_PLACEMENTS,
  BRACKET_ROUND_COLUMNS,
  KNOCKOUT_BRACKET_ROUNDS,
  KNOCKOUT_THIRD_PLACE_ROUND,
  getPreviousRoundMatchIds,
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

interface KnockoutBracketViewProps {
  teams: BracketTeam[]
  resolvedKnockout: Map<number, ResolvedMatchTeams>
  predictions: Record<number, BracketSlotPrediction>
  editable: boolean
  groupsComplete: boolean
  onPredictionSaved: (matchId: number, prediction: BracketSlotPrediction) => void
  persistMode?: 'server' | 'local'
  isMatchLocked?: (matchId: number) => boolean
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
}: {
  matchId: number
  homeTeam: BracketTeam
  awayTeam: BracketTeam
  winnerId: string | null
  editable: boolean
  pending: boolean
  onPick: (teamId: string) => void
  dense?: boolean
}) {
  const hasWinner = Boolean(winnerId)

  return (
    <div
      className={cn(
        'relative w-full rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm',
        dense ? 'p-1' : 'p-2',
        hasWinner ? 'border-primary/25' : 'border-border/60',
      )}
    >
      {!dense && (
        <p className="mb-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          M{matchId}
        </p>
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
    </div>
  )
}

function BracketConnector({ rowSpan }: { rowSpan: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none relative hidden w-3 shrink-0 lg:block xl:w-4"
      style={{ gridRowEnd: `span ${rowSpan}` }}
    >
      <div className="absolute inset-y-[12%] right-0 w-1/2 border-y border-r border-primary/25" />
      <div className="absolute left-1/2 top-1/2 h-px w-1/2 -translate-y-1/2 bg-primary/25" />
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
}: KnockoutBracketViewProps) {
  const [activeRoundIndex, setActiveRoundIndex] = useState(0)
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

  function advanceRoundIfComplete(
    matchId: number,
    roundIndex: number,
    nextPredictions: Record<number, BracketSlotPrediction>,
  ) {
    if (roundIndex < 0) return

    const round = KNOCKOUT_BRACKET_ROUNDS[roundIndex]
    const nextDone =
      getRoundProgress(round.matchIds, nextPredictions).done +
      (predictions[matchId] ? 0 : 1)

    if (nextDone === round.matchIds.length && roundIndex < KNOCKOUT_BRACKET_ROUNDS.length - 1) {
      setActiveRoundIndex(roundIndex + 1)
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
      advanceRoundIfComplete(matchId, roundIndex, {
        ...predictions,
        [matchId]: prediction,
      })
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
      advanceRoundIfComplete(matchId, roundIndex, {
        ...predictions,
        [matchId]: prediction,
      })
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
      />
    )
  }

  const activeRound = KNOCKOUT_BRACKET_ROUNDS[activeRoundIndex]
  const activeUnlocked = isKnockoutRoundUnlocked(
    activeRound.matchIds,
    getPreviousRoundMatchIds(activeRoundIndex),
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
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Tocá la bandera del ganador en cada cruce. La llave sigue el cuadro oficial: equipos del
        mismo grupo quedan en mitades opuestas (1.º vs 2.º solo pueden verse en la final).
      </p>

      {!groupsComplete && (
        <p className="rounded-lg border border-brand-gold/30 bg-brand-gold/10 px-4 py-3 text-sm">
          Completá la fase de grupos para desbloquear la llave.
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Mobile / tablet */}
      <div className="space-y-4 lg:hidden">
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
      </div>

      {/* Desktop: grid alineado al árbol FIFA */}
      <div className="hidden lg:block">
        <div className="mb-3 grid grid-cols-[1fr_auto_1fr] gap-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>Mitad izquierda → M101</span>
          <span className="opacity-40">|</span>
          <span>Mitad derecha → M102</span>
        </div>

        <div className="mb-2 grid grid-cols-9 gap-x-1 text-center xl:gap-x-2">
          {BRACKET_ROUND_COLUMNS.map((column, columnIndex) => (
            <div
              key={column.round}
              className="font-heading text-[10px] tracking-wide text-primary xl:text-xs"
              style={{ gridColumn: columnIndex * 2 + 1 }}
            >
              {column.shortLabel}
            </div>
          ))}
        </div>

        <div
          className="grid w-full gap-x-1 xl:gap-x-2"
          style={{
            gridTemplateRows: `repeat(${BRACKET_GRID_ROWS}, minmax(2.5rem, auto))`,
            gridTemplateColumns:
              'minmax(0,1fr) 0.75rem minmax(0,1fr) 0.75rem minmax(0,1fr) 0.75rem minmax(0,1fr) 0.75rem minmax(0,1fr)',
          }}
        >
          {BRACKET_ROUND_COLUMNS.map((column, columnIndex) => {
            const roundIndex = KNOCKOUT_BRACKET_ROUNDS.findIndex((r) => r.round === column.round)
            const slots = placementsByRound.get(column.round) ?? []
            const unlocked = isKnockoutRoundUnlocked(
              KNOCKOUT_BRACKET_ROUNDS[roundIndex]?.matchIds ?? [],
              getPreviousRoundMatchIds(roundIndex),
              predictions,
            )
            const canPlayRound = editable && groupsComplete && unlocked
            const matchColumn = columnIndex * 2 + 1
            const connectorColumn = columnIndex * 2 + 2

            return (
              <div key={column.round} className="contents">
                {slots.map((slot) => {
                  const roundIdx = roundIndexByMatchId.get(slot.matchId) ?? roundIndex
                  const showHalfDivider =
                    column.round === 'Semifinals' && slot.half === 'right'

                  return (
                    <div
                      key={slot.matchId}
                      className={cn(
                        'relative flex items-center px-0.5',
                        showHalfDivider && 'border-l border-dashed border-primary/20 pl-1',
                        slot.half === 'left' &&
                          column.round === 'Round of 32' &&
                          'bg-primary/[0.02]',
                        slot.half === 'right' &&
                          column.round === 'Round of 32' &&
                          'bg-brand-gold/[0.03]',
                      )}
                      style={{
                        gridColumn: matchColumn,
                        gridRow: `${slot.row} / span ${slot.rowSpan}`,
                      }}
                    >
                      {renderMatch(slot.matchId, canPlayRound, roundIdx, true)}
                    </div>
                  )
                })}

                {columnIndex < BRACKET_ROUND_COLUMNS.length - 1 &&
                  slots.map((slot) => (
                    <div
                      key={`connector-${slot.matchId}`}
                      className="flex items-center"
                      style={{
                        gridColumn: connectorColumn,
                        gridRow: `${slot.row} / span ${slot.rowSpan}`,
                      }}
                    >
                      <BracketConnector rowSpan={slot.rowSpan} />
                    </div>
                  ))}
              </div>
            )
          })}
        </div>
      </div>

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
    </div>
  )
}
