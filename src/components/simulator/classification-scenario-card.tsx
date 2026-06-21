'use client'

import { useMemo } from 'react'

import { CompletoMiniStandings } from '@/components/prode/completo/completo-mini-standings'
import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import type { ClassificationScenario } from '@/lib/bracket/classification-scenarios'
import type { Standing } from '@/lib/bracket'
import { formatGroupOutcomeLabel } from '@/lib/bracket/match-outcome'
import {
  buildScenarioProjectedOverrides,
  type ScenarioMatrixTeam,
} from '@/lib/bracket/scenario-result-matrix'
import {
  resolveGroupStandingsHybrid,
  type SimulatorGroupMatchRef,
} from '@/lib/bracket/simulator'
import { cn } from '@/lib/utils'

interface ClassificationScenarioCardProps {
  group: string
  teams: ScenarioMatrixTeam[]
  groupMatchRefs: SimulatorGroupMatchRef[]
  scenario: ClassificationScenario
  className?: string
}

function ScenarioPickRow({
  matchId,
  outcome,
  homeTeam,
  awayTeam,
  homeName,
  awayName,
}: {
  matchId: number
  outcome: Parameters<typeof formatGroupOutcomeLabel>[0]
  homeTeam?: ScenarioMatrixTeam
  awayTeam?: ScenarioMatrixTeam
  homeName: string
  awayName: string
}) {
  return (
    <li className="px-3 py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
          {homeTeam ? (
            <FlagIcon
              iso2={homeTeam.iso2}
              flagEmoji={homeTeam.flagEmoji}
              size="sm"
              className="shrink-0"
            />
          ) : null}
          <span className="truncate">{homeName}</span>
        </div>

        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          M{matchId}
        </span>

        <div className="flex min-w-0 items-center justify-end gap-1.5 text-sm font-medium">
          <span className="truncate text-right">{awayName}</span>
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

      <p className="mt-2 text-center text-sm font-medium text-foreground">
        {formatGroupOutcomeLabel(outcome, homeName, awayName)}
      </p>
    </li>
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

  const standingsForMini = useMemo((): Standing[] => {
    return projectedStandings.map((standing) => {
      const team = teamByName.get(standing.teamName)
      return {
        ...standing,
        team: team
          ? {
              nameEs: team.nameEs,
              iso2: team.iso2,
              flagEmoji: team.flagEmoji,
            }
          : standing.team,
      }
    })
  }, [projectedStandings, teamByName])

  const sortedPicks = useMemo(
    () => [...scenario.picks].sort((a, b) => a.matchId - b.matchId),
    [scenario.picks],
  )

  const extraLines = useMemo(
    () => scenario.lines.slice(sortedPicks.length),
    [scenario.lines, sortedPicks.length],
  )

  return (
    <div className={cn('space-y-3', className)}>
      {sortedPicks.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border/60">
          <ul className="divide-y divide-border/50">
            {sortedPicks.map((pick) => {
              const match = groupMatchRefs.find((entry) => entry.id === pick.matchId)
              if (!match) return null

              const homeTeam = teamByName.get(match.homeName)
              const awayTeam = teamByName.get(match.awayName)

              return (
                <ScenarioPickRow
                  key={pick.matchId}
                  matchId={pick.matchId}
                  outcome={pick.outcome}
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                  homeName={homeTeam?.nameEs ?? match.homeName}
                  awayName={awayTeam?.nameEs ?? match.awayName}
                />
              )
            })}
          </ul>
        </div>
      ) : (
        <p className="rounded-lg border border-border/60 px-3 py-2.5 text-sm text-muted-foreground">
          {scenario.lines[0] ?? 'Ya se cumple con los resultados actuales del grupo.'}
        </p>
      )}

      {extraLines.length > 0 ? (
        <ul className="space-y-1 px-1 text-xs leading-relaxed text-muted-foreground">
          {extraLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}

      <CompletoMiniStandings group={group} standings={standingsForMini} />
    </div>
  )
}
