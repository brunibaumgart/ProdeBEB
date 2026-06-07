import { AppShell } from '@/components/layout/app-shell'
import { GroupTable } from '@/components/ui-mundial'
import { getCachedGroupStandings } from '@/lib/queries/standings'

export const revalidate = 60

export const metadata = {
  title: 'Grupos',
  description: 'Tablas de posiciones del Mundial 2026 en tiempo real.',
}

export default async function GruposPage() {
  const tables = await getCachedGroupStandings()

  return (
    <AppShell pathname="/grupos">
      <div className="mb-6">
        <h1 className="font-heading text-3xl tracking-wide">GRUPOS</h1>
        <p className="mt-2 text-muted-foreground">
          Tablas de posiciones en tiempo real · top 2 clasifican · 3ros compiten por los 8 mejores
        </p>
      </div>

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
    </AppShell>
  )
}
