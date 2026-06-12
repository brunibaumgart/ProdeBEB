'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Radio } from 'lucide-react'
import { toast } from 'sonner'

import { notifyMatchStarted, setMatchResult, updateMatchLiveScore } from '@/app/actions/admin'
import { GoalScorersRow, type GoalScorerPlayer } from '@/components/prode/goal-scorer-picker'
import { MatchScoreboard } from '@/components/ui-mundial/match-scoreboard'
import { formatDbMatchKickoff } from '@/lib/time'
import { cn } from '@/lib/utils'

interface AdminMatchFormProps {
  match: {
    id: number
    date: string
    timeArg: string
    status?: string
    homeTeam: { id: string; nameEs: string; iso2: string; flagEmoji: string } | null
    awayTeam: { id: string; nameEs: string; iso2: string; flagEmoji: string } | null
    venue: { name: string }
    isTest?: boolean
    kickoffPushNotifiedAt?: string | null
  }
  homePlayers: GoalScorerPlayer[]
  awayPlayers: GoalScorerPlayer[]
  mode?: 'create' | 'edit' | 'live'
  initialHomeScore?: number | null
  initialAwayScore?: number | null
  initialHomeScorers?: string[]
  initialAwayScorers?: string[]
}

export function AdminMatchForm({
  match,
  homePlayers,
  awayPlayers,
  mode = 'create',
  initialHomeScore = null,
  initialAwayScore = null,
  initialHomeScorers = [],
  initialAwayScorers = [],
}: AdminMatchFormProps) {
  const isEdit = mode === 'edit'
  const isLive = mode === 'live'

  const [homeScore, setHomeScore] = useState<number | null>(initialHomeScore)
  const [awayScore, setAwayScore] = useState<number | null>(initialAwayScore)
  const [homeScorers, setHomeScorers] = useState<string[]>(initialHomeScorers)
  const [awayScorers, setAwayScorers] = useState<string[]>(initialAwayScorers)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isNotifyPending, startNotifyTransition] = useTransition()
  const router = useRouter()
  const canNotifyKickoff = isLive && !match.isTest && !match.kickoffPushNotifiedAt

  useEffect(() => {
    if (mode === 'create') return
    setHomeScore(initialHomeScore)
    setAwayScore(initialAwayScore)
    setHomeScorers(initialHomeScorers)
    setAwayScorers(initialAwayScorers)
  }, [
    mode,
    initialHomeScore,
    initialAwayScore,
    initialHomeScorers,
    initialAwayScorers,
    match.id,
  ])

  const totalGoals = (homeScore ?? 0) + (awayScore ?? 0)
  const showScorers = homeScore != null && awayScore != null && totalGoals > 0

  function getScorersPayload() {
    return {
      homePlayerIds: homeScorers.filter(Boolean),
      awayPlayerIds: awayScorers.filter(Boolean),
    }
  }

  function validateScores(): { homeScore: number; awayScore: number } | null {
    if (homeScore == null || awayScore == null) {
      setFeedback('Completá ambos resultados.')
      return null
    }
    return { homeScore, awayScore }
  }

  function handleSaveLiveScore() {
    const scores = validateScores()
    if (!scores) return

    startTransition(async () => {
      const result = await updateMatchLiveScore(
        match.id,
        scores.homeScore,
        scores.awayScore,
        getScorersPayload(),
      )
      setFeedback(result.ok ? result.message : result.error)
    })
  }

  function handleNotifyKickoff() {
    startNotifyTransition(async () => {
      const result = await notifyMatchStarted(match.id)
      if (result.ok) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleFinalize() {
    const scores = validateScores()
    if (!scores) return

    startTransition(async () => {
      const result = await setMatchResult(
        match.id,
        scores.homeScore,
        scores.awayScore,
        getScorersPayload(),
      )
      setFeedback(result.ok ? result.message : result.error)
    })
  }

  function handleSubmit() {
    const scores = validateScores()
    if (!scores) return

    startTransition(async () => {
      const result = await setMatchResult(
        match.id,
        scores.homeScore,
        scores.awayScore,
        getScorersPayload(),
      )
      setFeedback(result.ok ? result.message : result.error)
      if (result.ok && mode === 'create') {
        setHomeScore(null)
        setAwayScore(null)
        setHomeScorers([])
        setAwayScorers([])
      }
    })
  }

  if (!match.homeTeam || !match.awayTeam) {
    return null
  }

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      <p className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        {formatDbMatchKickoff(new Date(match.date), match.timeArg)} · {match.venue.name}
        {match.isTest && (
          <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
            Amistoso
          </span>
        )}
        {isLive && (
          <span className="rounded-full bg-brand-gold/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-gold">
            En juego
          </span>
        )}
        {isEdit && (
          <span className="rounded-full bg-brand-green/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-green">
            Finalizado
          </span>
        )}
      </p>

      <div className="p-4">
        {isLive ? (
          <p className="mb-3 text-xs text-muted-foreground">
            Guardá el marcador parcial mientras se juega. Los goleadores son opcionales hasta
            finalizar. Al terminar, usá &quot;Finalizar partido&quot; para calcular puntos.
          </p>
        ) : null}

        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-4 sm:px-4">
          <MatchScoreboard
            home={{
              name: match.homeTeam.nameEs,
              iso2: match.homeTeam.iso2,
              flagEmoji: match.homeTeam.flagEmoji,
            }}
            away={{
              name: match.awayTeam.nameEs,
              iso2: match.awayTeam.iso2,
              flagEmoji: match.awayTeam.flagEmoji,
            }}
            homeScore={homeScore}
            awayScore={awayScore}
            editable
            disabled={isPending}
            onHomeChange={setHomeScore}
            onAwayChange={setAwayScore}
            className="border-0 bg-transparent p-0"
          />

          {showScorers && homeScore != null && awayScore != null && (
            <GoalScorersRow
              homeCount={homeScore}
              awayCount={awayScore}
              homePlayers={homePlayers}
              awayPlayers={awayPlayers}
              homeValues={homeScorers}
              awayValues={awayScorers}
              onHomeChange={setHomeScorers}
              onAwayChange={setAwayScorers}
              disabled={isPending}
            />
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          {feedback && (
            <p
              className={cn(
                feedback.includes('guardado') ||
                  feedback.includes('Guardado') ||
                  feedback.includes('Marcador')
                  ? 'text-brand-green'
                  : 'text-destructive',
              )}
            >
              {feedback}
            </p>
          )}
          {isLive ? (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {canNotifyKickoff ? (
                <button
                  type="button"
                  onClick={handleNotifyKickoff}
                  disabled={isNotifyPending || isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isNotifyPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Radio className="size-4" aria-hidden />
                  )}
                  Avisar que el partido ha comenzado
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleSaveLiveScore}
                disabled={isPending || isNotifyPending}
                className="inline-flex items-center gap-2 rounded-lg border border-brand-gold/40 bg-brand-gold/10 px-4 py-2 text-sm font-medium text-brand-gold transition-colors hover:bg-brand-gold/20 disabled:opacity-50"
              >
                {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Guardar marcador
              </button>
              <button
                type="button"
                onClick={handleFinalize}
                disabled={isPending || isNotifyPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Finalizar partido
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="ml-auto inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {isEdit ? 'Guardar cambios' : 'Guardar resultado'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
