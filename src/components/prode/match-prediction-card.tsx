'use client'

import Link from 'next/link'
import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react'
import { ExternalLink, Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'

import { savePrediction } from '@/app/actions/predictions'
import { GoalScorersRow, type GoalScorerPlayer } from '@/components/prode/goal-scorer-picker'
import { adjustScorersToCount } from '@/lib/scoring/scorers'
import { MatchScoreboard } from '@/components/ui-mundial/match-scoreboard'
import { FriendlyMatchBadge } from '@/components/ui-mundial/friendly-match-badge'
import { PredictionLock } from '@/components/ui-mundial/prediction-lock'
import { SoccerBallIcon } from '@/components/ui-mundial/soccer-ball-icon'
import { canEditPrediction, isMatchPredictable } from '@/lib/matches/availability'
import {
  friendlyMatchCardClass,
  friendlyMatchHeaderClass,
  friendlyMatchScoreboardClass,
  isFriendlyMatch,
} from '@/lib/matches/friendly'
import { formatDbMatchKickoff } from '@/lib/time'
import { ROUND_LABELS, type MatchRound } from '@/types'
import { cn } from '@/lib/utils'

interface MatchPredictionCardProps {
  match: {
    id: number
    date: Date
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
  prediction?: {
    predHome: number
    predAway: number
    predPenaltiesWinnerId?: string | null
    points: number | null
    pointsScorers?: number | null
    homeScorerIds?: string[]
    awayScorerIds?: string[]
  } | null
  homePlayers?: GoalScorerPlayer[]
  awayPlayers?: GoalScorerPlayer[]
  scorersEnabled?: boolean
  autoOpenEdit?: boolean
}

type EditMode = 'idle' | 'full' | 'scorers'

function getPointsBadgeClass(points: number | null) {
  if (points == null) return 'text-muted-foreground'
  if (points >= 3) return 'text-brand-green'
  if (points >= 1) return 'text-brand-gold'
  return 'text-muted-foreground'
}

function getScorerPointsBadgeClass(points: number | null) {
  if (points == null || points === 0) return 'text-muted-foreground'
  if (points >= 5) return 'text-brand-green'
  return 'text-brand-gold'
}

export function MatchPredictionCard({
  match,
  prediction,
  homePlayers = [],
  awayPlayers = [],
  scorersEnabled = true,
  autoOpenEdit = false,
}: MatchPredictionCardProps) {
  const cardRef = useRef<HTMLElement>(null)
  const predictable = isMatchPredictable(match)
  const canEdit = predictable && canEditPrediction(match)
  const isFinished = match.status === 'finished'
  const locked = predictable && !canEdit && !isFinished
  const friendly = isFriendlyMatch(match)
  const isKnockout = match.round !== 'Group Stage' && !match.isTest

  const [savedPrediction, setSavedPrediction] = useState(prediction ?? null)
  const [optimisticPrediction, applyOptimisticPrediction] = useOptimistic(
    savedPrediction,
    (
      _current,
      next: NonNullable<typeof savedPrediction>,
    ) => next,
  )
  const displayPrediction = optimisticPrediction
  const [predHome, setPredHome] = useState<number | null>(prediction?.predHome ?? null)
  const [predAway, setPredAway] = useState<number | null>(prediction?.predAway ?? null)
  const [predPenaltiesWinnerId, setPredPenaltiesWinnerId] = useState<string | null>(
    prediction?.predPenaltiesWinnerId ?? null,
  )
  const [homeScorers, setHomeScorers] = useState<string[]>(prediction?.homeScorerIds ?? [])
  const [awayScorers, setAwayScorers] = useState<string[]>(prediction?.awayScorerIds ?? [])
  const [editMode, setEditMode] = useState<EditMode>(() => {
    if (autoOpenEdit && canEdit) return 'full'
    return prediction ? 'idle' : 'full'
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!autoOpenEdit || !canEdit) return
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setEditMode('full')
  }, [autoOpenEdit, canEdit])

  useEffect(() => {
    setSavedPrediction(prediction ?? null)
    setPredHome(prediction?.predHome ?? null)
    setPredAway(prediction?.predAway ?? null)
    setPredPenaltiesWinnerId(prediction?.predPenaltiesWinnerId ?? null)
    setHomeScorers(prediction?.homeScorerIds ?? [])
    setAwayScorers(prediction?.awayScorerIds ?? [])
    if (!autoOpenEdit || !canEdit) {
      setEditMode(prediction ? 'idle' : 'full')
    }
  }, [prediction, autoOpenEdit, canEdit])

  const isEditingScore = editMode === 'full'
  const isEditingScorersOnly = editMode === 'scorers'
  const isEditing = editMode !== 'idle'

  const activeHome = isEditingScore ? predHome : (displayPrediction?.predHome ?? null)
  const activeAway = isEditingScore ? predAway : (displayPrediction?.predAway ?? null)
  const totalGoals = (activeHome ?? 0) + (activeAway ?? 0)

  useEffect(() => {
    if (totalGoals === 0 && isEditingScorersOnly) {
      setEditMode(savedPrediction ? 'idle' : 'full')
      setHomeScorers([])
      setAwayScorers([])
    }
  }, [totalGoals, isEditingScorersOnly, savedPrediction])

  function restoreFromSaved() {
    setPredHome(savedPrediction?.predHome ?? null)
    setPredAway(savedPrediction?.predAway ?? null)
    setPredPenaltiesWinnerId(savedPrediction?.predPenaltiesWinnerId ?? null)
    setHomeScorers(savedPrediction?.homeScorerIds ?? [])
    setAwayScorers(savedPrediction?.awayScorerIds ?? [])
  }

  function handleEditFull() {
    restoreFromSaved()
    setError(null)
    setEditMode('full')
  }

  function handleEditScorersOnly() {
    restoreFromSaved()
    setError(null)
    setEditMode('scorers')
  }

  function handleCancel() {
    restoreFromSaved()
    setError(null)
    setEditMode(savedPrediction ? 'idle' : 'full')
  }

  function handleSave() {
    const home = isEditingScore ? predHome : savedPrediction?.predHome
    const away = isEditingScore ? predAway : savedPrediction?.predAway

    if (home == null || away == null) {
      setError('Completá ambos resultados.')
      return
    }

    setError(null)

    const isDraw = home === away
    const penaltiesWinner = isKnockout && isDraw ? predPenaltiesWinnerId : null

    const normalizedHomeScorers = adjustScorersToCount(homeScorers, home)
    const normalizedAwayScorers = adjustScorersToCount(awayScorers, away)
    const nextPrediction = {
      predHome: home,
      predAway: away,
      predPenaltiesWinnerId: penaltiesWinner,
      points: savedPrediction?.points ?? null,
      pointsScorers: savedPrediction?.pointsScorers ?? null,
      homeScorerIds: normalizedHomeScorers.filter(Boolean),
      awayScorerIds: normalizedAwayScorers.filter(Boolean),
    }

    startTransition(async () => {
      applyOptimisticPrediction(nextPrediction)
      setEditMode('idle')

      const result = await savePrediction(
        match.id,
        home,
        away,
        { homePlayerIds: nextPrediction.homeScorerIds, awayPlayerIds: nextPrediction.awayScorerIds },
        penaltiesWinner,
      )
      if (result.ok) {
        setHomeScorers(normalizedHomeScorers)
        setAwayScorers(normalizedAwayScorers)
        setSavedPrediction(nextPrediction)
        toast.success(
          isEditingScorersOnly ? 'Goleadores guardados' : 'Predicción guardada',
        )
      } else {
        setError(result.error)
        toast.error(result.error)
        setEditMode(isEditingScorersOnly ? 'scorers' : 'full')
      }
    })
  }

  const home = {
    name: match.homeTeam?.nameEs ?? match.homeLabel ?? 'Por definir',
    iso2: match.homeTeam?.iso2,
    flagEmoji: match.homeTeam?.flagEmoji,
  }

  const away = {
    name: match.awayTeam?.nameEs ?? match.awayLabel ?? 'Por definir',
    iso2: match.awayTeam?.iso2,
    flagEmoji: match.awayTeam?.flagEmoji,
  }

  const canOfferScorers =
    scorersEnabled &&
    canEdit &&
    totalGoals > 0 &&
    homePlayers.length > 0 &&
    awayPlayers.length > 0

  const canGuessScorersFromHeader = canOfferScorers && displayPrediction != null

  const hasSavedScorers =
    (displayPrediction?.homeScorerIds?.length ?? 0) > 0 ||
    (displayPrediction?.awayScorerIds?.length ?? 0) > 0

  const showScorerPickers =
    canOfferScorers && (editMode === 'full' || editMode === 'scorers')

  const showSavedScorersReadOnly =
    editMode === 'idle' && hasSavedScorers && displayPrediction != null

  const showHeaderActions = canEdit && editMode === 'idle' && displayPrediction != null

  const editingIsDraw =
    isEditingScore && activeHome != null && activeAway != null && activeHome === activeAway
  const showPenaltiesPicker = isKnockout && editingIsDraw && isEditingScore && predictable

  const savedIsDraw =
    displayPrediction != null &&
    displayPrediction.predHome === displayPrediction.predAway
  const showSavedPenaltiesWinner =
    editMode === 'idle' &&
    isKnockout &&
    savedIsDraw &&
    displayPrediction?.predPenaltiesWinnerId != null

  return (
    <article
      ref={cardRef}
      id={`match-${match.id}`}
      className={cn(
        'flex h-full flex-col overflow-visible rounded-xl border',
        friendlyMatchCardClass(friendly)
      )}
    >
      <div className={friendlyMatchHeaderClass(friendly)}>
        <div className="flex flex-wrap items-center gap-2">
          {friendly ? (
            <FriendlyMatchBadge size="md" className="bg-white/15 text-white" />
          ) : (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              {ROUND_LABELS[match.round as MatchRound] ?? match.round}
            </span>
          )}
          {match.group && !friendly && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 font-medium text-white/90">
              Grupo {match.group}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-white/90">
          <span>{formatDbMatchKickoff(match.date, match.timeArg)}</span>
          <Link
            href={`/fixture/${match.id}`}
            className="inline-flex size-7 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Ver predicciones del partido y torneos"
          >
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
          {locked && <PredictionLock reason="Cerrado" />}
          {showHeaderActions && (
            <>
              <button
                type="button"
                onClick={handleEditFull}
                className="inline-flex size-7 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Editar predicción"
              >
                <Pencil className="size-3.5" aria-hidden />
              </button>
              {canGuessScorersFromHeader && (
                <button
                  type="button"
                  onClick={handleEditScorersOnly}
                  disabled={isPending}
                  className="inline-flex size-7 items-center justify-center rounded-md bg-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
                  aria-label="Adivinar goleadores"
                >
                  <SoccerBallIcon />
                </button>
              )}
            </>
          )}
          {isFinished && displayPrediction?.points != null && (
            <span
              className={cn(
                'rounded-full bg-background px-2 py-0.5 font-bold tabular-nums',
                getPointsBadgeClass(displayPrediction.points)
              )}
            >
              {displayPrediction.points} pts
            </span>
          )}
          {isFinished && scorersEnabled && displayPrediction?.pointsScorers != null && (
            <span
              className={cn(
                'rounded-full bg-background px-2 py-0.5 font-bold tabular-nums',
                getScorerPointsBadgeClass(displayPrediction.pointsScorers)
              )}
            >
              +{displayPrediction.pointsScorers} goles
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        {!predictable ? (
          <p className="text-sm text-muted-foreground">
            Partido pendiente de definición de equipos.
          </p>
        ) : (
          <div className={friendlyMatchScoreboardClass(friendly)}>
            <MatchScoreboard
              home={home}
              away={away}
              homeScore={activeHome}
              awayScore={activeAway}
              homeRealScore={match.homeScore}
              awayRealScore={match.awayScore}
              editable={isEditingScore}
              disabled={isPending}
              showReal={isFinished}
              onHomeChange={setPredHome}
              onAwayChange={setPredAway}
              className="border-0 bg-transparent p-0"
              contrast
            />

            {showScorerPickers && activeHome != null && activeAway != null && (
              <GoalScorersRow
                homeCount={activeHome}
                awayCount={activeAway}
                homePlayers={homePlayers}
                awayPlayers={awayPlayers}
                homeValues={homeScorers}
                awayValues={awayScorers}
                onHomeChange={setHomeScorers}
                onAwayChange={setAwayScorers}
                disabled={isPending}
              />
            )}

            {showSavedScorersReadOnly && displayPrediction && (
              <GoalScorersRow
                homeCount={displayPrediction.predHome}
                awayCount={displayPrediction.predAway}
                homePlayers={homePlayers}
                awayPlayers={awayPlayers}
                homeValues={displayPrediction.homeScorerIds ?? []}
                awayValues={displayPrediction.awayScorerIds ?? []}
                onHomeChange={() => {}}
                onAwayChange={() => {}}
                readOnly
              />
            )}

            {showPenaltiesPicker && match.homeTeamId && match.awayTeamId && match.homeTeam && match.awayTeam && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-center text-xs font-medium text-white/70">
                  ¿Quién avanza por penales? <span className="text-brand-gold">+2 pts</span>
                </p>
                <div className="flex gap-2">
                  {[
                    { id: match.homeTeamId, ...match.homeTeam },
                    { id: match.awayTeamId, ...match.awayTeam },
                  ].map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => setPredPenaltiesWinnerId(predPenaltiesWinnerId === team.id ? null : team.id)}
                      disabled={isPending}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-medium transition-colors disabled:opacity-50',
                        predPenaltiesWinnerId === team.id
                          ? 'border-brand-gold bg-brand-gold/20 text-brand-gold'
                          : 'border-white/20 text-white/70 hover:border-white/40 hover:text-white',
                      )}
                    >
                      <span>{team.flagEmoji}</span>
                      <span className="truncate">{team.nameEs}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showSavedPenaltiesWinner && displayPrediction && (() => {
              const winnerId = displayPrediction.predPenaltiesWinnerId
              const winnerTeam =
                winnerId === match.homeTeamId ? match.homeTeam : match.awayTeam
              if (!winnerTeam) return null
              return (
                <p className="mt-2 text-center text-xs text-white/70">
                  Penales: <span className="font-medium text-white/90">{winnerTeam.flagEmoji} {winnerTeam.nameEs}</span>
                </p>
              )
            })()}
          </div>
        )}

        <p className="mt-3 text-center text-xs text-white/70">{match.venue.name}</p>

        {isEditing && (
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-4">
            <div className="text-sm">
              {error && <p className="text-destructive">{error}</p>}
            </div>
            <div className="flex items-center gap-2">
              {savedPrediction != null && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isPending}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  Cancelar
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {isEditingScorersOnly ? 'Guardar goleadores' : 'Guardar'}
              </button>
            </div>
          </div>
        )}

        {editMode === 'idle' && predictable && !displayPrediction && !canEdit && !isFinished && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Todavía no predijiste este partido
          </p>
        )}
      </div>
    </article>
  )
}
