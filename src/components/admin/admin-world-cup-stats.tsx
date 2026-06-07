import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import { PositionBadge } from '@/components/ui-mundial/position-badge'
import type { WorldCupStatistics } from '@/lib/queries/world-cup-stats'
import type { Position } from '@/types'

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-3xl tabular-nums">{value}</p>
    </div>
  )
}

function TeamRankingTable({
  title,
  teams,
  highlightColumn,
}: {
  title: string
  teams: WorldCupStatistics['teamsByGoalsScored']
  highlightColumn: 'goalsFor' | 'goalsAgainst' | 'goalDifference' | 'cleanSheets'
}) {
  const columnLabels = {
    goalsFor: 'GF',
    goalsAgainst: 'GC',
    goalDifference: 'DG',
    cleanSheets: 'Vallas inv.',
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <h3 className="border-b border-border/60 bg-muted/30 px-4 py-3 font-heading text-lg tracking-wide">
        {title}
      </h3>
      {teams.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          Todavía no hay partidos oficiales finalizados.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">#</th>
              <th className="px-4 py-2.5 text-left font-medium">Selección</th>
              <th className="px-4 py-2.5 text-right font-medium">PJ</th>
              <th className="px-4 py-2.5 text-right font-medium">GF</th>
              <th className="px-4 py-2.5 text-right font-medium">GC</th>
              <th className="px-4 py-2.5 text-right font-medium">DG</th>
              <th className="px-4 py-2.5 text-right font-medium">{columnLabels[highlightColumn]}</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, index) => (
              <tr key={team.teamId} className="border-b border-border/40 last:border-0">
                <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{index + 1}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-2 font-medium">
                    <FlagIcon iso2={team.iso2} flagEmoji={team.flagEmoji} size="sm" />
                    {team.nameEs}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {team.played}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{team.goalsFor}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{team.goalsAgainst}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{team.goalDifference}</td>
                <td className="px-4 py-2.5 text-right font-heading tabular-nums text-primary">
                  {highlightColumn === 'goalsFor' && team.goalsFor}
                  {highlightColumn === 'goalsAgainst' && team.goalsAgainst}
                  {highlightColumn === 'goalDifference' && team.goalDifference}
                  {highlightColumn === 'cleanSheets' && team.cleanSheets}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

export function AdminWorldCupStats({ stats }: { stats: WorldCupStatistics }) {
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard label="Partidos" value={stats.summary.finishedMatches} />
        <SummaryCard label="Goles totales" value={stats.summary.totalGoals} />
        <SummaryCard label="Prom. goles/partido" value={stats.summary.avgGoalsPerMatch} />
        <SummaryCard label="Goleadores" value={stats.summary.uniqueScorers} />
        <SummaryCard label="Selecciones" value={stats.summary.teamsWithMatches} />
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <h3 className="border-b border-border/60 bg-muted/30 px-4 py-3 font-heading text-lg tracking-wide">
          TABLA DE GOLEADORES
        </h3>
        {stats.topScorers.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Todavía no hay goleadores cargados en partidos oficiales.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">#</th>
                <th className="px-4 py-2.5 text-left font-medium">Jugador</th>
                <th className="px-4 py-2.5 text-left font-medium">Selección</th>
                <th className="px-4 py-2.5 text-right font-medium">Goles</th>
              </tr>
            </thead>
            <tbody>
              {stats.topScorers.map((scorer, index) => (
                <tr key={scorer.playerId} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <PositionBadge position={scorer.position as Position} />
                      {scorer.playerName}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <FlagIcon iso2={scorer.iso2} flagEmoji={scorer.flagEmoji} size="sm" />
                      {scorer.teamNameEs}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-heading tabular-nums text-primary">
                    {scorer.goals}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <TeamRankingTable
          title="MÁS GOLES A FAVOR"
          teams={stats.teamsByGoalsScored}
          highlightColumn="goalsFor"
        />
        <TeamRankingTable
          title="MENOS GOLES EN CONTRA"
          teams={stats.teamsByGoalsConceded}
          highlightColumn="goalsAgainst"
        />
        <TeamRankingTable
          title="MEJOR DIFERENCIA DE GOL"
          teams={stats.teamsByGoalDifference}
          highlightColumn="goalDifference"
        />
        <TeamRankingTable
          title="MÁS VALLAS INVICTAS"
          teams={[...stats.teamsByGoalsScored].sort(
            (a, b) =>
              b.cleanSheets - a.cleanSheets ||
              a.goalsAgainst - b.goalsAgainst ||
              a.nameEs.localeCompare(b.nameEs, 'es')
          )}
          highlightColumn="cleanSheets"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Solo partidos oficiales del Mundial finalizados (sin amistosos de prueba). Los goleadores
        requieren cargar autores de gol al confirmar resultados.
      </p>
    </div>
  )
}
