import { Suspense } from 'react'
import type { CSSProperties } from 'react'
import Link from 'next/link'

import { AppShell } from '@/components/layout/app-shell'
import { ConfederationTabs } from '@/components/selecciones/confederation-tabs'
import { FlagIcon } from '@/components/ui-mundial'
import { getTeamsData } from '@/lib/data'
import { getTeamsByConfederation } from '@/lib/queries/teams'
import { slugifyTeamName } from '@/lib/teams'
import type { Confederation } from '@/types'

interface SeleccionesPageProps {
  searchParams: Promise<{ conf?: string }>
}

export default async function SeleccionesPage({ searchParams }: SeleccionesPageProps) {
  const params = await searchParams
  const confederation = params.conf as Confederation | undefined
  const { confederations } = getTeamsData()
  const teams = await getTeamsByConfederation(confederation)

  return (
    <AppShell pathname="/selecciones">
      <div className="mb-6">
        <h1 className="font-heading text-3xl tracking-wide">SELECCIONES</h1>
        <p className="mt-2 text-muted-foreground">
          {teams.length} selecciones · Mundial 2026
        </p>
      </div>

      <Suspense fallback={null}>
        <ConfederationTabs current={params.conf} colors={confederations} />
      </Suspense>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {teams.map((team) => {
          const conf = confederations[team.confederation]

          return (
            <Link
              key={team.id}
              href={`/selecciones/${slugifyTeamName(team.name)}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
              style={
                conf?.color
                  ? ({ borderLeftWidth: 3, borderLeftColor: conf.color } as CSSProperties)
                  : undefined
              }
            >
              <FlagIcon iso2={team.iso2} flagEmoji={team.flagEmoji} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{team.nameEs}</span>
                <span className="text-xs text-muted-foreground">
                  Grupo {team.group} · {conf?.label_es ?? team.confederation}
                </span>
              </span>
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: conf?.color ?? 'var(--muted)' }}
                aria-hidden
              />
            </Link>
          )
        })}
      </div>
    </AppShell>
  )
}
