import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MapPin } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'
import type { Metadata } from 'next'

import { AppShell } from '@/components/layout/app-shell'
import { FlagIcon, RoundLabel } from '@/components/ui-mundial'
import { FriendlyMatchBadge } from '@/components/ui-mundial/friendly-match-badge'
import { canAccessTestContent } from '@/lib/auth/test-access'
import { friendlyMatchCardClass, isFriendlyMatch } from '@/lib/matches/friendly'
import { getMatchTitle } from '@/lib/match-label'
import { getMatchById, getOfficialMatchIds } from '@/lib/queries/matches'
import { formatDbMatchKickoff, formatUtcTime, toArgentinaTime } from '@/lib/time'
import { cn } from '@/lib/utils'

interface MatchDetailPageProps {
  params: Promise<{ matchId: string }>
}

export const revalidate = 60

export async function generateStaticParams() {
  try {
    const ids = await getOfficialMatchIds()
    return ids.map((matchId) => ({ matchId: String(matchId) }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: MatchDetailPageProps): Promise<Metadata> {
  const { matchId } = await params
  const id = parseInt(matchId, 10)
  if (Number.isNaN(id)) return {}

  const match = await getMatchById(id, { includeTestMatches: false })
  if (!match) return {}

  const title = getMatchTitle(match)
  const description = `${formatDbMatchKickoff(match.date, match.timeArg)} · ${match.venue.name}, ${match.venue.city}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  }
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    scheduled: { label: 'Programado', className: 'bg-muted text-muted-foreground' },
    live: { label: 'En vivo', className: 'bg-brand-red/20 text-brand-red' },
    finished: { label: 'Finalizado', className: 'bg-brand-green/20 text-brand-green' },
  }[status] ?? { label: status, className: 'bg-muted text-muted-foreground' }

  return (
    <span className={cn('rounded-full px-3 py-1 text-xs font-bold uppercase', config.className)}>
      {config.label}
    </span>
  )
}

function TeamBlock({
  team,
  label,
  score,
  kitColor,
}: {
  team?: { nameEs: string; iso2: string; flagEmoji: string; kitPrimary: string } | null
  label: string
  score: number | null
  kitColor?: string
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-3 text-center">
      <div
        className="flex size-16 items-center justify-center rounded-2xl sm:size-20"
        style={{ backgroundColor: kitColor ?? 'var(--muted)' }}
      >
        {team ? (
          <FlagIcon iso2={team.iso2} flagEmoji={team.flagEmoji} size="lg" />
        ) : (
          <span className="text-2xl text-muted-foreground">?</span>
        )}
      </div>
      <div>
        <p className="font-heading text-xl tracking-wide sm:text-2xl">{team?.nameEs ?? label}</p>
        {score != null && (
          <p className="mt-1 font-heading text-4xl tabular-nums text-primary sm:text-5xl">
            {score}
          </p>
        )}
      </div>
    </div>
  )
}

export default async function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { matchId } = await params
  const id = parseInt(matchId, 10)
  if (Number.isNaN(id)) notFound()

  const { userId: clerkId } = await auth()
  const includeTestMatches = await canAccessTestContent(clerkId)

  const match = await getMatchById(id, { includeTestMatches })
  if (!match) notFound()

  const isFinished = match.status === 'finished'
  const isLive = match.status === 'live'
  const showScore = isFinished || isLive
  const friendly = isFriendlyMatch(match)

  return (
    <AppShell pathname="/fixture">
      <Link
        href="/fixture"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver al fixture
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {friendly ? <FriendlyMatchBadge size="md" /> : <RoundLabel round={match.round} variant="badge" />}
        {match.group && !friendly && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Grupo {match.group}
          </span>
        )}
        <StatusBadge status={match.status} />
      </div>

      <section className={cn('rounded-2xl border p-6 sm:p-8', friendlyMatchCardClass(friendly))}>
        <div className="mb-8 flex items-center justify-center gap-4 sm:gap-8">
          <TeamBlock
            team={match.homeTeam}
            label={match.homeLabel ?? 'Local'}
            score={showScore ? match.homeScore : null}
            kitColor={match.homeTeam?.kitPrimary}
          />
          <span className="font-heading text-2xl text-muted-foreground sm:text-3xl">VS</span>
          <TeamBlock
            team={match.awayTeam}
            label={match.awayLabel ?? 'Visitante'}
            score={showScore ? match.awayScore : null}
            kitColor={match.awayTeam?.kitPrimary}
          />
        </div>

        {isFinished && match.homeScore != null && match.awayScore != null && (
          <div className="mb-8 rounded-xl bg-primary/10 py-4 text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              Resultado final
            </p>
            <p className="font-heading mt-1 text-3xl tabular-nums tracking-wide">
              {match.homeScore} - {match.awayScore}
            </p>
          </div>
        )}

        <dl className="grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Fecha y hora
            </dt>
            <dd className="mt-1 font-medium">{formatDbMatchKickoff(match.date, match.timeArg)}</dd>
            <dd className="text-sm text-muted-foreground">
              {toArgentinaTime(match.date)} ARG · {formatUtcTime(match.date)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Estadio
            </dt>
            <dd className="mt-1 flex items-start gap-1.5 font-medium">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                {match.venue.name}
                <span className="block text-sm font-normal text-muted-foreground">
                  {match.venue.city}, {match.venue.country} ·{' '}
                  {match.venue.capacity.toLocaleString('es-AR')} espectadores
                </span>
              </span>
            </dd>
          </div>
        </dl>
      </section>
    </AppShell>
  )
}
