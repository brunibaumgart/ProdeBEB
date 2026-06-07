import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { CalendarSearch } from 'lucide-react'

import { AppShell } from '@/components/layout/app-shell'
import { FixtureFilters } from '@/components/fixture/fixture-filters'
import { EmptyState } from '@/components/ui/empty-state'
import { MatchCard } from '@/components/ui-mundial'
import { canAccessTestContent } from '@/lib/auth/test-access'
import { getDistinctGroups, getTeamSelectOptions } from '@/lib/queries/teams'
import { getMatches, groupMatchesByDay } from '@/lib/queries/matches'
import { formatDayHeader } from '@/lib/time'
import type { MatchRound } from '@/types'

interface FixturePageProps {
  searchParams: Promise<{
    grupo?: string
    fase?: string
    equipo?: string
  }>
}

export const metadata = {
  title: 'Fixture',
  description: 'Calendario completo del Mundial 2026 con horarios en Argentina.',
}

export default async function FixturePage({ searchParams }: FixturePageProps) {
  const params = await searchParams
  const { userId: clerkId } = await auth()
  const includeTestMatches = await canAccessTestContent(clerkId)
  const teamQueryOptions = { includeTestContent: includeTestMatches }
  const matchQueryOptions = { includeTestMatches }

  const [groups, teams, matches] = await Promise.all([
    getDistinctGroups(teamQueryOptions),
    getTeamSelectOptions(teamQueryOptions),
    getMatches(
      {
        group: params.grupo,
        round: params.fase as MatchRound | undefined,
        teamId: params.equipo,
      },
      matchQueryOptions
    ),
  ])

  const grouped = groupMatchesByDay(matches)

  return (
    <AppShell pathname="/fixture">
      <div className="mb-6">
        <h1 className="font-heading text-3xl tracking-wide">FIXTURE</h1>
        <p className="mt-2 text-muted-foreground">
          {matches.length} partido{matches.length !== 1 ? 's' : ''} · horarios en Argentina
        </p>
      </div>

      <Suspense fallback={null}>
        <FixtureFilters
          groups={groups}
          teams={teams}
          current={{
            grupo: params.grupo,
            fase: params.fase,
            equipo: params.equipo,
          }}
        />
      </Suspense>

      <div className="mt-8 space-y-8">
        {matches.length === 0 ? (
          <EmptyState
            icon={CalendarSearch}
            title="No hay partidos con esos filtros"
            description="Probá cambiar el grupo, la fase o el equipo seleccionado."
          />
        ) : (
          [...grouped.entries()].map(([dayKey, dayMatches]) => (
            <section key={dayKey}>
              <h2 className="mb-3 font-heading text-xl capitalize tracking-wide text-primary">
                {formatDayHeader(dayMatches[0].date)}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dayMatches.map((match) => (
                  <MatchCard key={match.id} match={match} href={`/fixture/${match.id}`} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </AppShell>
  )
}
