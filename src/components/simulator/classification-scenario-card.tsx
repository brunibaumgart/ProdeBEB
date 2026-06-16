'use client'

import { useMemo } from 'react'

import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import type { ClassificationScenario } from '@/lib/bracket/classification-scenarios'
import type { GroupMatchOutcome } from '@/lib/bracket/match-outcome'
import {
  buildScenarioProjectedOverrides,
  type ScenarioMatrixTeam,
} from '@/lib/bracket/scenario-result-matrix'
import {
  resolveGroupStandingsHybrid,
  type SimulatorGroupMatchRef,
} from '@/lib/bracket/simulator'
import type { BracketSlotPrediction } from '@/lib/queries/bracket'
import { cn } from '@/lib/utils'

interface ClassificationScenarioCardProps {
  group: string
  teams: ScenarioMatrixTeam[]
  groupMatchRefs: SimulatorGroupMatchRef[]
  scenario: ClassificationScenario
  className?: string
}

function OutcomeChips({ outcome }: { outcome: GroupMatchOutcome }) {
  return (
    <div
      className="flex shrink-0 gap-0.5 rounded-md border border-border/50 bg-muted/15 p-0.5"
      aria-label={
        outcome === 'home_win' ? 'Victoria local' : outcome === 'draw' ? 'Empate' : 'Victoria visitante'
      }
    >
      {(['home_win', 'draw', 'away_win'] as const).map((value) => {
        const active = outcome === value
        const label = value === 'home_win' ? 'V' : value === 'draw' ? 'E' : 'L'
        return (
          <span
            key={value}
            className={cn(
              'min-w-[1.35rem] rounded px-1 py-0.5 text-center text-[10px] font-semibold tabular-nums',
              active && value === 'home_win' && 'bg-emerald-500/25 text-emerald-600 dark:text-emerald-300',
              active && value === 'draw' && 'bg-amber-400/25 text-amber-800 dark:text-amber-200',
              active && value === 'away_win' && 'bg-rose-500/25 text-rose-600 dark:text-rose-300',
              !active && 'text-muted-foreground/35',
            )}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}

function ScenarioStandingsMini({
  group,
  teams,
  standings,
}: {
  group: string
  teams: ScenarioMatrixTeam[]
  standings: ReturnType<typeof resolveGroupStandingsHybrid>
}) {
  const teamByName = useMemo(() => new Map(teams.map((team) => [team.name, team])), [teams])

  return (
    <div className="overflow-hidden rounded-lg border border-border/50">
      <div className="border-b border-border/50 bg-muted/20 px-3 py-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Tabla proyectada · Grupo {group}
        </p>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/40 text-[10px] text-muted-foreground">
            <th className="w-7 py-1.5 pl-2 text-left font-medium">#</th>
            <th className="py-1.5 text-left font-medium">Equipo</th>
            <th className="w-9 py-1.5 text-center font-medium">DG</th>
            <th className="w-9 py-1.5 pr-2 text-center font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing, index) => {
            const team = teamByName.get(standing.teamName)
            const isQualified = index < 2
            return (
              <tr
                key={standing.teamName}
                className={cn(
                  'border-b border-border/30 last:border-0',
                  isQualified && 'bg-brand-green/[0.06]',
                  index === 2 && 'bg-muted/15',
                )}
              >
                <td className="py-1.5 pl-2 tabular-nums text-muted-foreground">{index + 1}</td>
                <td className="max-w-0 py-1.5 pr-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {team ? (
                      <FlagIcon
                        iso2={team.iso2}
                        flagEmoji={team.flagEmoji}
                        size="sm"
                        className="shrink-0"
                      />
                    ) : null}
                    <span className="truncate font-medium">
                      {team?.nameEs ?? standing.teamName}
                    </span>
                  </div>
                </td>
                <td className="py-1.5 text-center tabular-nums text-muted-foreground">
                  {standing.goalDiff > 0 ? `+${standing.goalDiff}` : standing.goalDiff}
                </td>
                <td className="py-1.5 pr-2 text-center font-semibold tabular-nums">
                  {standing.points}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function ClassificationScenarioCard({
  group,
  teams,
  groupMatchRefs,
  scenario,
  className,
}: ClassificationScenarioCardProps) {
  const teamByName = useMemo(() => new Map(teams.map((team) => [team.name, team])), [teams])

  const projectedStandings = useMemo(() => {
    const overrides = buildScenarioProjectedOverrides(groupMatchRefs, scenario.picks)
    return resolveGroupStandingsHybrid(teams, groupMatchRefs, overrides, group)
  }, [teams, groupMatchRefs, scenario.picks, group])

  const sortedPicks = useMemo(
    () => [...scenario.picks].sort((a, b) => a.matchId - b.matchId),
    [scenario.picks],
  )

  return (
    <div className={cn('space-y-3', className)}>
      {sortedPicks.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Partidos pendientes
          </p>
          <ul className="space-y-1.5">
            {sortedPicks.map((pick) => {
              const match = groupMatchRefs.find((entry) => entry.id === pick.matchId)
              if (!match) return null

              const homeTeam = teamByName.get(match.homeName)
              const awayTeam = teamByName.get(match.awayName)

              return (
                <li
                  key={pick.matchId}
                  className="rounded-lg border border-border/50 bg-muted/10 px-2.5 py-2"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                    <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium">
                      {homeTeam ? (
                        <FlagIcon
                          iso2={homeTeam.iso2}
                          flagEmoji={homeTeam.flagEmoji}
                          size="sm"
                          className="shrink-0"
                        />
                      ) : null}
                      <span className="truncate">{homeTeam?.nameEs ?? match.homeName}</span>
                    </div>

                    <OutcomeChips outcome={pick.outcome} />

                    <div className="flex min-w-0 items-center justify-end gap-1.5 text-xs font-medium">
                      <span className="truncate text-right">
                        {awayTeam?.nameEs ?? match.awayName}
                      </span>
                      {awayTeam ? (
                        <FlagIcon
                          iso2={awayTeam.iso2}
                          flagEmoji={awayTeam.flagEmoji}
                          size="sm"
                          className="shrink-0"
                        />
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <p className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
          Ya se cumple con los resultados actuales del grupo.
        </p>
      )}

      <ScenarioStandingsMini group={group} teams={teams} standings={projectedStandings} />
    </div>
  )
}
