'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { AdminPredictionTable } from '@/components/admin/admin-prediction-table'
import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import { formatDbMatchKickoff } from '@/lib/time'
import type { AdminPredictionView } from '@/lib/queries/admin'
import { cn } from '@/lib/utils'

type MatchOption = {
  id: number
  date: string
  timeArg: string
  status: string
  homeTeam: { nameEs: string; iso2: string; flagEmoji: string } | null
  awayTeam: { nameEs: string; iso2: string; flagEmoji: string } | null
  predictionCount: number
}

type UserPrediction = {
  id: string
  predHome: number
  predAway: number
  points: number | null
  pointsScorers: number | null
  scorerNames: string[]
  match: {
    id: number
    date: string
    timeArg: string
    status: string
    homeScore: number | null
    awayScore: number | null
    homeTeam: { nameEs: string; iso2: string; flagEmoji: string } | null
    awayTeam: { nameEs: string; iso2: string; flagEmoji: string } | null
  }
}

interface AdminPredictionsPanelProps {
  matches: MatchOption[]
  selectedMatchId: number | null
  selectedMatchPredictions: AdminPredictionView[]
  selectedUser: { id: string; name: string; email: string } | null
  userPredictions: UserPrediction[]
}

function MatchTeams({ match }: { match: MatchOption | UserPrediction['match'] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1">
        {match.homeTeam ? (
          <FlagIcon iso2={match.homeTeam.iso2} flagEmoji={match.homeTeam.flagEmoji} size="sm" />
        ) : null}
        {match.homeTeam?.nameEs ?? 'Local'}
      </span>
      <span className="text-muted-foreground">vs</span>
      <span className="inline-flex items-center gap-1">
        {match.awayTeam ? (
          <FlagIcon iso2={match.awayTeam.iso2} flagEmoji={match.awayTeam.flagEmoji} size="sm" />
        ) : null}
        {match.awayTeam?.nameEs ?? 'Visitante'}
      </span>
    </span>
  )
}

export function AdminPredictionsPanel({
  matches,
  selectedMatchId,
  selectedMatchPredictions,
  selectedUser,
  userPredictions,
}: AdminPredictionsPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [matchQuery, setMatchQuery] = useState('')

  const filteredMatches = useMemo(() => {
    const normalized = matchQuery.trim().toLowerCase()
    if (!normalized) return matches
    return matches.filter((match) => {
      const label = `${match.homeTeam?.nameEs ?? ''} ${match.awayTeam?.nameEs ?? ''} #${match.id}`
      return label.toLowerCase().includes(normalized)
    })
  }, [matchQuery, matches])

  function buildHref(params: { matchId?: number | null; userId?: string | null }) {
    const next = new URLSearchParams(searchParams.toString())
    next.set('tab', 'predicciones')

    if (params.matchId) next.set('matchId', String(params.matchId))
    else next.delete('matchId')

    if (params.userId) next.set('userId', params.userId)
    else next.delete('userId')

    return `/admin?${next.toString()}`
  }

  function selectMatch(matchId: number) {
    router.push(buildHref({ matchId, userId: null }))
  }

  if (selectedUser) {
    return (
      <div className="space-y-4">
        <Link
          href={buildHref({ matchId: selectedMatchId, userId: null })}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Volver a predicciones por partido
        </Link>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-heading text-xl tracking-wide">{selectedUser.name}</h2>
          <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {userPredictions.length} predicción{userPredictions.length === 1 ? '' : 'es'} en total
          </p>
        </div>

        {userPredictions.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            Este usuario todavía no hizo predicciones.
          </p>
        ) : (
          <div className="space-y-3">
            {userPredictions.map((prediction) => (
              <article key={prediction.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-4 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">
                      <MatchTeams match={prediction.match} />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      #{prediction.match.id} ·{' '}
                      {formatDbMatchKickoff(new Date(prediction.match.date), prediction.match.timeArg)}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-heading text-lg tabular-nums">
                      {prediction.predHome} - {prediction.predAway}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {prediction.match.homeScore != null && prediction.match.awayScore != null
                        ? `Real: ${prediction.match.homeScore} - ${prediction.match.awayScore}`
                        : 'Sin resultado'}
                      {' · '}
                      {prediction.points ?? '—'} pts
                      {(prediction.pointsScorers ?? 0) > 0 ? ` · +${prediction.pointsScorers}G` : ''}
                    </p>
                  </div>
                </div>
                {prediction.scorerNames.length > 0 ? (
                  <p className="px-4 py-2 text-sm text-muted-foreground">
                    Goleadores: {prediction.scorerNames.join(', ')}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(240px,320px)_1fr]">
      <aside className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-heading text-lg tracking-wide">PARTIDOS</h2>
        <input
          type="search"
          value={matchQuery}
          onChange={(event) => setMatchQuery(event.target.value)}
          placeholder="Buscar partido…"
          className="mb-3 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <div className="max-h-[480px] space-y-1 overflow-y-auto">
          {filteredMatches.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Sin partidos con predicciones.</p>
          ) : (
            filteredMatches.map((match) => {
              const isActive = match.id === selectedMatchId
              return (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => selectMatch(match.id)}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                    isActive
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-transparent hover:border-border hover:bg-muted/40',
                  )}
                >
                  <p className="font-medium leading-snug">
                    <MatchTeams match={match} />
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    #{match.id} · {formatDbMatchKickoff(new Date(match.date), match.timeArg)} ·{' '}
                    {match.predictionCount} pred.
                  </p>
                </button>
              )
            })
          )}
        </div>
      </aside>

      <section className="rounded-xl border border-border bg-card p-4">
        {selectedMatchId == null ? (
          <p className="py-10 text-center text-muted-foreground">
            Elegí un partido para ver quién predijo qué.
          </p>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="font-heading text-xl tracking-wide">
                {(() => {
                  const match = matches.find((item) => item.id === selectedMatchId)
                  return match ? <MatchTeams match={match} /> : `Partido #${selectedMatchId}`
                })()}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedMatchPredictions.length} predicción
                {selectedMatchPredictions.length === 1 ? '' : 'es'}
              </p>
            </div>
            <AdminPredictionTable predictions={selectedMatchPredictions} />
          </>
        )}
      </section>
    </div>
  )
}
