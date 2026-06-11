import { AppShell } from '@/components/layout/app-shell'
import { WorldCupStatsView } from '@/components/mundial/world-cup-stats-view'
import { getWorldCupStatistics } from '@/lib/queries/world-cup-stats'

export const revalidate = 60

export const metadata = {
  title: 'Estadísticas',
  description: 'Goleadores, goles totales y rankings de selecciones del Mundial 2026.',
}

export default async function EstadisticasPage() {
  const stats = await getWorldCupStatistics()

  return (
    <AppShell pathname="/estadisticas">
      <div className="mb-6">
        <h1 className="font-heading text-3xl tracking-wide">ESTADÍSTICAS</h1>
        <p className="mt-2 text-muted-foreground">
          Goleadores y rankings del torneo · se actualiza con cada resultado oficial cargado
        </p>
      </div>

      <WorldCupStatsView stats={stats} />
    </AppShell>
  )
}
