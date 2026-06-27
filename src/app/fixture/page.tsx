import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { CalendarSearch } from 'lucide-react'

import { AppShell } from '@/components/layout/app-shell'
import { FixtureFilters } from '@/components/fixture/fixture-filters'
import { FixtureTodayScroller } from '@/components/fixture/fixture-today-scroller'
import { EmptyState } from '@/components/ui/empty-state'
import { MatchCard } from '@/components/ui-mundial'
import { canAccessTestContent } from '@/lib/auth/test-access'
import { getDistinctGroups, getTeamSelectOptions, getAllTeams } from '@/lib/queries/teams'
import { getMatches, getGroupStageMatches, getKnockoutMatches, groupMatchesByDay } from '@/lib/queries/matches'
import { formatDayHeader, getArgentinaTodayDateStr } from '@/lib/time'
import { resolveClinichedGroupPositions } from '@/lib/bracket'
import { resolvePredictedBracket } from '@/lib/bracket/predicted-bracket'
import type { MatchRound } from '@/types'

const GROUPS = 'ABCDEFGHIJKL'.split('')

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

  const [groups, teamOptions, matches, allTeams, groupStageMatches, knockoutMs] = await Promise.all([
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
    getAllTeams(),
    getGroupStageMatches(matchQueryOptions),
    getKnockoutMatches(matchQueryOptions),
  ])

  // Compute confirmed R32 teams from complete groups
  const teamById = new Map(allTeams.map((t) => [t.id, t]))
  const teamByName = new Map(allTeams.map((t) => [t.name, t]))

  const realGroupStandings = new Map<string, ReturnType<typeof resolveClinichedGroupPositions>>()
  for (const group of GROUPS) {
    const gMatches = groupStageMatches.filter((m) => m.group === group)
    const finished = gMatches.filter((m) => m.status === 'finished')
    const pending = gMatches.filter((m) => m.status !== 'finished')
    if (finished.length > 0) {
      const gTeams = allTeams.filter((t) => t.group === group)
      realGroupStandings.set(group, resolveClinichedGroupPositions(gTeams, finished, pending, group))
    } else {
      realGroupStandings.set(group, [])
    }
  }

  const resolvedFromStandings = resolvePredictedBracket(
    realGroupStandings,
    knockoutMs.map((m) => ({ id: m.id, homeLabel: m.homeLabel, awayLabel: m.awayLabel })),
    {},
    {},
    teamByName,
  )

  type ConfirmedTeam = { nameEs: string; iso2: string; flagEmoji: string }
  const confirmedTeamsMap = new Map<number, { home: ConfirmedTeam | null; away: ConfirmedTeam | null }>()
  for (const [matchId, res] of resolvedFromStandings) {
    const home = res.homeTeamId ? (teamById.get(res.homeTeamId) ?? null) : null
    const away = res.awayTeamId ? (teamById.get(res.awayTeamId) ?? null) : null
    if (home || away) {
      confirmedTeamsMap.set(matchId, { home, away })
    }
  }

  const grouped = groupMatchesByDay(matches)
  const todayKey = getArgentinaTodayDateStr()
  const noFilters = !params.grupo && !params.fase && !params.equipo
  const hasTodaySection = grouped.has(todayKey)

  return (
    <AppShell pathname="/fixture">
      {noFilters && hasTodaySection && <FixtureTodayScroller todayKey={todayKey} />}

      <div className="mb-6">
        <h1 className="font-heading text-3xl tracking-wide">FIXTURE</h1>
        <p className="mt-2 text-muted-foreground">
          {matches.length} partido{matches.length !== 1 ? 's' : ''} · horarios en Argentina
        </p>
      </div>

      <Suspense fallback={null}>
        <FixtureFilters
          groups={groups}
          teams={teamOptions}
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
          [...grouped.entries()].map(([dayKey, dayMatches]) => {
            const isToday = dayKey === todayKey
            return (
              <section key={dayKey} id={`day-${dayKey}`}>
                <h2
                  className={
                    isToday
                      ? 'mb-3 font-heading text-xl capitalize tracking-wide text-brand-gold'
                      : 'mb-3 font-heading text-xl capitalize tracking-wide text-primary'
                  }
                >
                  {isToday ? '📅 HOY · ' : ''}{formatDayHeader(dayMatches[0].date)}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {dayMatches.map((match) => {
                    const ct = confirmedTeamsMap.get(match.id)
                    return (
                      <MatchCard
                        key={match.id}
                        match={match}
                        href={`/fixture/${match.id}`}
                        confirmedHomeTeam={ct?.home ?? null}
                        confirmedAwayTeam={ct?.away ?? null}
                      />
                    )
                  })}
                </div>
              </section>
            )
          })
        )}
      </div>
    </AppShell>
  )
}
