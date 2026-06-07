import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

import { AppShell } from '@/components/layout/app-shell'
import {
  FlagIcon,
  GroupTable,
  MatchCard,
  PositionBadge,
} from '@/components/ui-mundial'
import { resolveGroupStandingsFromDb } from '@/lib/bracket'
import { canAccessTestContent } from '@/lib/auth/test-access'
import { getTeamsData } from '@/lib/data'
import { getGroupStageMatches, getTeamMatches } from '@/lib/queries/matches'
import { getOfficialTeamSlugs, getTeamBySlug, getTeamsByGroup, groupPlayersByPosition } from '@/lib/queries/teams'
import type { Position } from '@/types'

interface TeamDetailPageProps {
  params: Promise<{ slug: string }>
}

export const revalidate = 60

export async function generateStaticParams() {
  try {
    const slugs = await getOfficialTeamSlugs()
    return slugs.map((slug) => ({ slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: TeamDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const team = await getTeamBySlug(slug, { includeTestContent: false })
  if (!team) return {}

  return {
    title: team.nameEs,
    description: `Plantel, fixture y grupo de ${team.nameEs} en el Mundial 2026.`,
    openGraph: {
      title: `${team.nameEs} · Mundial 2026`,
      description: `Plantel, fixture y grupo de ${team.nameEs} en el Mundial 2026.`,
    },
  }
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { slug } = await params
  const { userId: clerkId } = await auth()
  const includeTestMatches = await canAccessTestContent(clerkId)
  const teamQueryOptions = { includeTestContent: includeTestMatches }

  const team = await getTeamBySlug(slug, teamQueryOptions)
  if (!team) notFound()

  const { confederations } = getTeamsData()
  const conf = confederations[team.confederation]

  const [teamMatches, groupTeams, groupMatches] = await Promise.all([
    getTeamMatches(team.id, { includeTestMatches }),
    getTeamsByGroup(team.group, teamQueryOptions),
    getGroupStageMatches(),
  ])

  const now = Date.now()
  const upcoming = teamMatches.filter(
    (match) => match.status === 'scheduled' && match.date.getTime() >= now
  )
  const recent = teamMatches
    .filter((match) => match.status === 'finished')
    .sort((a, b) => b.date.getTime() - a.date.getTime())
  const displayMatches = upcoming.length > 0 ? upcoming.slice(0, 3) : recent.slice(0, 3)
  const matchesLabel = upcoming.length > 0 ? 'Próximos partidos' : 'Últimos partidos'

  const standings = resolveGroupStandingsFromDb(groupTeams, groupMatches, team.group)
  const playerGroups = groupPlayersByPosition(team.players)

  return (
    <AppShell pathname="/selecciones">
      <Link
        href="/selecciones"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver a selecciones
      </Link>

      <header
        className="mb-8 rounded-2xl border border-border p-6 sm:p-8"
        style={{
          background: `linear-gradient(135deg, ${team.kitPrimary}22 0%, var(--card) 60%)`,
        }}
      >
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div
            className="flex size-20 items-center justify-center rounded-2xl sm:size-24"
            style={{ backgroundColor: team.kitPrimary }}
          >
            <FlagIcon iso2={team.iso2} flagEmoji={team.flagEmoji} size="lg" />
          </div>
          <div className="flex-1">
            <h1 className="font-heading text-4xl tracking-wide">{team.nameEs}</h1>
            <p className="mt-1 text-muted-foreground">
              Grupo {team.group} · {conf?.label_es ?? team.confederation}
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 sm:justify-start">
              {[team.kitPrimary, team.kitSecondary, team.kitThird].filter(Boolean).map((color) => (
                <span
                  key={color}
                  className="size-6 rounded-full border border-border"
                  style={{ backgroundColor: color! }}
                  aria-hidden
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 font-heading text-xl tracking-wide">{matchesLabel.toUpperCase()}</h2>
          {displayMatches.length > 0 ? (
            <div className="space-y-3">
              {displayMatches.map((match) => (
                <MatchCard key={match.id} match={match} href={`/fixture/${match.id}`} />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Sin partidos para mostrar.
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-4 font-heading text-xl tracking-wide">GRUPO {team.group}</h2>
          <GroupTable group={team.group} standings={standings} compact />
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-4 font-heading text-xl tracking-wide">
          PLANTEL · {team.players.length} JUGADORES
        </h2>
        <div className="space-y-6">
          {playerGroups.map(({ position, players }) => (
            <div key={position}>
              <div className="mb-3 flex items-center gap-2">
                <PositionBadge position={position as Position} />
                <span className="text-sm text-muted-foreground">{players.length}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{player.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{player.club}</p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {player.internationalMatches} caps
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  )
}
