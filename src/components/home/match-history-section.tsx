'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import { cn } from '@/lib/utils'

type TeamInfo = { nameEs: string; iso2: string; flagEmoji: string } | null

type HistoryPrediction = {
  id: string
  matchId: number
  predHome: number
  predAway: number
  points: number | null
  pointsScorers: number | null
  match: {
    date: Date
    homeScore: number | null
    awayScore: number | null
    homeLabel: string | null
    awayLabel: string | null
    homeTeam: TeamInfo
    awayTeam: TeamInfo
  }
}

interface MatchHistorySectionProps {
  predictions: HistoryPrediction[]
}

const PAGE_SIZE = 10

function getResultLabel(
  pts: number,
  predHome: number,
  predAway: number,
  homeScore: number | null,
  awayScore: number | null,
): { label: string; color: string } {
  if (homeScore == null || awayScore == null) return { label: '—', color: 'text-muted-foreground' }

  if (predHome === homeScore && predAway === awayScore) {
    return { label: 'Exacto', color: 'text-brand-green' }
  }

  const predDiff = predHome - predAway
  const realDiff = homeScore - awayScore
  const sameOutcome =
    (predHome > predAway && homeScore > awayScore) ||
    (predHome < predAway && homeScore < awayScore) ||
    (predHome === predAway && homeScore === awayScore)

  if (sameOutcome && predDiff === realDiff) {
    return { label: 'Gan. + DG', color: 'text-brand-gold' }
  }
  if (sameOutcome) {
    return { label: 'Ganador', color: 'text-brand-gold' }
  }
  return { label: 'Sin pts', color: 'text-muted-foreground' }
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: 'numeric',
    month: 'short',
  })
}

export function MatchHistorySection({ predictions }: MatchHistorySectionProps) {
  const [page, setPage] = useState(0)

  const totalPages = Math.ceil(predictions.length / PAGE_SIZE)
  const start = page * PAGE_SIZE
  const pageItems = predictions.slice(start, start + PAGE_SIZE)

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-2xl tracking-wide">MI HISTORIAL</h2>
        <span className="text-sm text-muted-foreground">
          {predictions.length} partido{predictions.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="divide-y divide-border/60">
          {pageItems.map((pred) => {
            const totalPts =
              pred.points != null ? pred.points + (pred.pointsScorers ?? 0) : null
            const resultInfo = pred.points != null
              ? getResultLabel(
                  pred.points,
                  pred.predHome,
                  pred.predAway,
                  pred.match.homeScore,
                  pred.match.awayScore,
                )
              : { label: 'Pend.', color: 'text-muted-foreground' }

            const pointsColor =
              totalPts == null
                ? 'text-muted-foreground'
                : totalPts >= 3
                  ? 'text-brand-green'
                  : totalPts >= 1
                    ? 'text-brand-gold'
                    : 'text-muted-foreground'

            return (
              <Link
                key={pred.id}
                href={`/fixture/${pred.matchId}`}
                className="flex items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-muted/30 sm:gap-3"
              >
                <span className="w-16 shrink-0 text-[11px] text-muted-foreground">
                  {formatDateShort(pred.match.date)}
                </span>

                <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                  {pred.match.homeTeam && (
                    <FlagIcon
                      iso2={pred.match.homeTeam.iso2}
                      flagEmoji={pred.match.homeTeam.flagEmoji}
                      size="sm"
                    />
                  )}
                  <span className="hidden min-w-0 truncate font-medium sm:block">
                    {pred.match.homeTeam?.nameEs ?? pred.match.homeLabel ?? 'Local'}
                  </span>
                  <span className="shrink-0 font-heading text-base tabular-nums text-primary">
                    {pred.match.homeScore ?? '?'}-{pred.match.awayScore ?? '?'}
                  </span>
                  <span className="hidden min-w-0 truncate font-medium sm:block">
                    {pred.match.awayTeam?.nameEs ?? pred.match.awayLabel ?? 'Visit.'}
                  </span>
                  {pred.match.awayTeam && (
                    <FlagIcon
                      iso2={pred.match.awayTeam.iso2}
                      flagEmoji={pred.match.awayTeam.flagEmoji}
                      size="sm"
                    />
                  )}
                </span>

                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {pred.predHome}-{pred.predAway}
                </span>

                <span className={cn('w-16 shrink-0 text-right text-[11px] font-semibold', resultInfo.color)}>
                  {resultInfo.label}
                  {pred.pointsScorers != null && pred.pointsScorers > 0 && (
                    <span className="ml-0.5 text-brand-green">+{pred.pointsScorers}⚽</span>
                  )}
                </span>

                <span className={cn('w-10 shrink-0 text-right text-xs font-bold', pointsColor)}>
                  {totalPts != null ? `${totalPts}p` : '—'}
                </span>
              </Link>
            )
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/60 px-3 py-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" aria-hidden />
              Anterior
            </button>
            <span className="text-xs text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              Siguiente
              <ChevronRight className="size-3.5" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
