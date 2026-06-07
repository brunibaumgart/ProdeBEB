'use client'

import { useEffect, useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'

import { setMatchResult } from '@/app/actions/admin'
import { GoalScorersRow, type GoalScorerPlayer } from '@/components/prode/goal-scorer-picker'
import { MatchScoreboard } from '@/components/ui-mundial/match-scoreboard'
import { formatDbMatchKickoff } from '@/lib/time'

interface AdminMatchFormProps {
  match: {
    id: number
    date: string
    timeArg: string
    homeTeam: { id: string; nameEs: string; iso2: string; flagEmoji: string } | null
    awayTeam: { id: string; nameEs: string; iso2: string; flagEmoji: string } | null
    venue: { name: string }
    isTest?: boolean
  }
  homePlayers: GoalScorerPlayer[]
  awayPlayers: GoalScorerPlayer[]
  mode?: 'create' | 'edit'
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

  const [homeScore, setHomeScore] = useState<number | null>(initialHomeScore)
  const [awayScore, setAwayScore] = useState<number | null>(initialAwayScore)
  const [homeScorers, setHomeScorers] = useState<string[]>(initialHomeScorers)
  const [awayScorers, setAwayScorers] = useState<string[]>(initialAwayScorers)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!isEdit) return
    setHomeScore(initialHomeScore)
    setAwayScore(initialAwayScore)
    setHomeScorers(initialHomeScorers)
    setAwayScorers(initialAwayScorers)
  }, [
    isEdit,
    initialHomeScore,
    initialAwayScore,
    initialHomeScorers,
    initialAwayScorers,
    match.id,
  ])

  const totalGoals = (homeScore ?? 0) + (awayScore ?? 0)
  const showScorers = homeScore != null && awayScore != null && totalGoals > 0

  function handleSubmit() {
    if (homeScore == null || awayScore == null) {
      setFeedback('Completá ambos resultados.')
      return
    }

    startTransition(async () => {
      const result = await setMatchResult(match.id, homeScore, awayScore, {
        homePlayerIds: homeScorers.filter(Boolean),
        awayPlayerIds: awayScorers.filter(Boolean),
      })
      setFeedback(result.ok ? result.message : result.error)
      if (result.ok && !isEdit) {
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
      <p className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        {formatDbMatchKickoff(new Date(match.date), match.timeArg)} · {match.venue.name}
        {match.isTest && (
          <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
            Amistoso
          </span>
        )}
        {isEdit && (
          <span className="rounded-full bg-brand-green/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-green">
            Finalizado
          </span>
        )}
      </p>

      <div className="p-4">
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

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
          {feedback && (
            <p
              className={
                feedback.includes('guardado') || feedback.includes('Guardado')
                  ? 'text-brand-green'
                  : 'text-destructive'
              }
            >
              {feedback}
            </p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {isEdit ? 'Guardar cambios' : 'Guardar resultado'}
          </button>
        </div>
      </div>
    </article>
  )
}
