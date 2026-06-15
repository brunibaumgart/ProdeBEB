import { Suspense } from 'react'

import { AppShell } from '@/components/layout/app-shell'
import { GruposTabs } from '@/components/grupos/grupos-tabs'
import { SimulatorView } from '@/components/simulator/simulator-view'
import { GroupTable } from '@/components/ui-mundial'
import { getGroupStageMatches, getKnockoutMatches } from '@/lib/queries/matches'
import { getCachedGroupStandings } from '@/lib/queries/standings'
import { getAllTeams } from '@/lib/queries/teams'

export const revalidate = 60

export const metadata = {
  title: 'Grupos',
  description: 'Tablas de posiciones y simulador de escenarios del Mundial 2026.',
}

function serializeMatch(
  match: Awaited<ReturnType<typeof getGroupStageMatches>>[number] | Awaited<ReturnType<typeof getKnockoutMatches>>[number],
) {
  return {
    id: match.id,
    round: match.round,
    matchday: match.matchday,
    group: match.group,
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    homeLabel: match.homeLabel,
    awayLabel: match.awayLabel,
    homeTeam: match.homeTeam
      ? {
          id: match.homeTeam.id,
          name: match.homeTeam.name,
          nameEs: match.homeTeam.nameEs,
          iso2: match.homeTeam.iso2,
          flagEmoji: match.homeTeam.flagEmoji,
        }
      : null,
    awayTeam: match.awayTeam
      ? {
          id: match.awayTeam.id,
          name: match.awayTeam.name,
          nameEs: match.awayTeam.nameEs,
          iso2: match.awayTeam.iso2,
          flagEmoji: match.awayTeam.flagEmoji,
        }
      : null,
  }
}

interface GruposPageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function GruposPage({ searchParams }: GruposPageProps) {
  const params = await searchParams
  const activeTab = params.tab === 'simulador' ? 'simulador' : 'oficial'

  const [tables, teams, groupMatches, knockoutMatches] = await Promise.all([
    getCachedGroupStandings(),
    getAllTeams(),
    getGroupStageMatches(),
    getKnockoutMatches(),
  ])

  return (
    <AppShell pathname="/grupos">
      <div className="mb-6">
        <h1 className="font-heading text-3xl tracking-wide">GRUPOS</h1>
        <p className="mt-2 text-muted-foreground">
          {activeTab === 'simulador'
            ? 'Simulá resultados pendientes y explorá cómo quedarían las fases del torneo.'
            : 'Tablas de posiciones en tiempo real · top 2 clasifican · 3ros compiten por los 8 mejores'}
        </p>
      </div>

      <Suspense fallback={<div className="mb-8 h-10" />}>
        <div className="mb-8">
          <GruposTabs current={activeTab} />
        </div>
      </Suspense>

      {activeTab === 'simulador' ? (
        <SimulatorView
          teams={teams.map((team) => ({
            id: team.id,
            name: team.name,
            nameEs: team.nameEs,
            group: team.group,
            iso2: team.iso2,
            flagEmoji: team.flagEmoji,
          }))}
          groupMatches={groupMatches.map(serializeMatch)}
          knockoutMatches={knockoutMatches.map(serializeMatch)}
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded bg-brand-green/30" />
              Clasificados (1° y 2°)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded bg-muted/60" />
              Posible 3°
            </span>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {tables.map(({ group, standings }) => (
              <GroupTable key={group} group={group} standings={standings} />
            ))}
          </div>
        </>
      )}
    </AppShell>
  )
}
