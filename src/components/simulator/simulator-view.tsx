'use client'

import { useEffect, useMemo, useState } from 'react'
import { RotateCcw, Sparkles, Trophy } from 'lucide-react'

import { KnockoutBracketView } from '@/components/prode/knockout-bracket-view'
import { ClassificationScenariosPanel } from '@/components/simulator/classification-scenarios-panel'
import { GroupR32OpponentsPanel } from '@/components/simulator/group-r32-opponents-panel'
import { SimulatorMatchRow } from '@/components/simulator/simulator-match-row'
import { Button } from '@/components/ui/button'
import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import { GroupTable } from '@/components/ui-mundial/group-table'
import { getDownstreamKnockoutMatchIds } from '@/lib/bracket/knockout-bracket-layout'
import { resolveGroupR32Opponents } from '@/lib/bracket/group-r32-opponents'
import type { ClassificationScenario } from '@/lib/bracket/classification-scenarios'
import { resolvePredictedBracket } from '@/lib/bracket/predicted-bracket'
import {
  buildEffectiveSimulatorPredictions,
  buildSimulatorBasePredictions,
  clearSimulatorOverrides,
  getSimulatorBestThirds,
  getSimulatorGroupProgress,
  loadSimulatorOverrides,
  pruneSimulatorOverrides,
  resolveGroupStandingsHybrid,
  saveSimulatorOverrides,
  type SimulatorGroupMatchRef,
  type SimulatorMatchRef,
} from '@/lib/bracket/simulator'
import {
  outcomeToScores,
  type GroupMatchOutcome,
} from '@/lib/bracket/match-outcome'
import type { BracketSlotPrediction } from '@/lib/queries/bracket'
import { cn } from '@/lib/utils'

type SerializableTeam = {
  id: string
  name: string
  nameEs: string
  group: string
  iso2: string
  flagEmoji: string
}

type SerializableMatch = {
  id: number
  round: string
  matchday: number | null
  group: string | null
  status: string
  homeScore: number | null
  awayScore: number | null
  homeLabel: string | null
  awayLabel: string | null
  homeTeam: {
    id: string
    name: string
    nameEs: string
    iso2: string
    flagEmoji: string
  } | null
  awayTeam: {
    id: string
    name: string
    nameEs: string
    iso2: string
    flagEmoji: string
  } | null
}

interface SimulatorViewProps {
  teams: SerializableTeam[]
  groupMatches: SerializableMatch[]
  knockoutMatches: SerializableMatch[]
}

const GROUPS = 'ABCDEFGHIJKL'.split('')

const STEPS = [
  { id: 1, label: 'Grupos' },
  { id: 2, label: 'Eliminatorias' },
  { id: 3, label: 'Proyección' },
] as const

function toGroupMatchRef(match: SerializableMatch): SimulatorGroupMatchRef | null {
  if (!match.group || !match.homeTeam || !match.awayTeam) return null
  return {
    id: match.id,
    status: match.status,
    group: match.group,
    matchday: match.matchday,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    homeTeamId: match.homeTeam.id,
    awayTeamId: match.awayTeam.id,
    homeName: match.homeTeam.name,
    awayName: match.awayTeam.name,
  }
}

function toMatchRef(match: SerializableMatch): SimulatorMatchRef | null {
  if (!match.homeTeam || !match.awayTeam) return null
  return {
    id: match.id,
    status: match.status,
    group: match.group,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    homeTeamId: match.homeTeam.id,
    awayTeamId: match.awayTeam.id,
    homeName: match.homeTeam.name,
    awayName: match.awayTeam.name,
  }
}

export function SimulatorView({ teams, groupMatches, knockoutMatches }: SimulatorViewProps) {
  const groupMatchRefs = useMemo(
    () => groupMatches.map(toGroupMatchRef).filter((match): match is SimulatorGroupMatchRef => match != null),
    [groupMatches],
  )
  const allMatchRefs = useMemo(
    () =>
      [...groupMatches, ...knockoutMatches]
        .map(toMatchRef)
        .filter((match): match is SimulatorMatchRef => match != null),
    [groupMatches, knockoutMatches],
  )

  const basePredictions = useMemo(
    () => buildSimulatorBasePredictions(allMatchRefs),
    [allMatchRefs],
  )

  const pendingMatchIds = useMemo(() => {
    const ids = new Set<number>()
    for (const match of allMatchRefs) {
      if (match.status !== 'finished' || match.homeScore == null || match.awayScore == null) {
        ids.add(match.id)
      }
    }
    return ids
  }, [allMatchRefs])

  const [overrides, setOverrides] = useState<Record<number, BracketSlotPrediction>>(() =>
    loadSimulatorOverrides(),
  )
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedGroup, setSelectedGroup] = useState('A')

  const effectiveOverrides = useMemo(
    () => pruneSimulatorOverrides(overrides, pendingMatchIds),
    [overrides, pendingMatchIds],
  )

  useEffect(() => {
    saveSimulatorOverrides(effectiveOverrides)
  }, [effectiveOverrides])

  const predictions = useMemo(
    () => buildEffectiveSimulatorPredictions(basePredictions, effectiveOverrides),
    [basePredictions, effectiveOverrides],
  )

  const teamByName = useMemo(() => new Map(teams.map((team) => [team.name, team])), [teams])

  const groupStandings = useMemo(() => {
    const map = new Map<string, ReturnType<typeof resolveGroupStandingsHybrid>>()
    for (const group of GROUPS) {
      const groupTeams = teams.filter((team) => team.group === group)
      map.set(group, resolveGroupStandingsHybrid(groupTeams, groupMatchRefs, effectiveOverrides, group))
    }
    return map
  }, [teams, groupMatchRefs, effectiveOverrides])

  const resolvedKnockout = useMemo(
    () =>
      resolvePredictedBracket(
        groupStandings,
        knockoutMatches.map((match) => ({
          id: match.id,
          homeLabel: match.homeLabel,
          awayLabel: match.awayLabel,
        })),
        predictions,
        predictions,
        teamByName,
      ),
    [groupStandings, knockoutMatches, predictions, teamByName],
  )

  const groupProgress = useMemo(
    () => getSimulatorGroupProgress(groupMatchRefs, effectiveOverrides),
    [groupMatchRefs, effectiveOverrides],
  )

  const knockoutProgress = useMemo(() => {
    const total = knockoutMatches.length
    const done = knockoutMatches.filter((match) => predictions[match.id] != null).length
    return { done, total }
  }, [knockoutMatches, predictions])

  const bestThirds = useMemo(
    () => getSimulatorBestThirds(groupStandings, groupMatchRefs, effectiveOverrides),
    [groupStandings, groupMatchRefs, effectiveOverrides],
  )

  const finalists = useMemo(() => {
    const finalMatch = resolvedKnockout.get(104)
    const home = finalMatch?.homeTeamId ? teams.find((team) => team.id === finalMatch.homeTeamId) : null
    const away = finalMatch?.awayTeamId ? teams.find((team) => team.id === finalMatch.awayTeamId) : null
    const championId = predictions[104]
      ? decodeFinalChampion(predictions[104], finalMatch?.homeTeamId, finalMatch?.awayTeamId)
      : null
    const champion = championId ? teams.find((team) => team.id === championId) : null
    return { home, away, champion }
  }, [resolvedKnockout, teams, predictions])

  const selectedGroupTeams = useMemo(
    () => teams.filter((team) => team.group === selectedGroup),
    [teams, selectedGroup],
  )

  const selectedGroupMatchRefs = useMemo(
    () => groupMatchRefs.filter((match) => match.group === selectedGroup),
    [groupMatchRefs, selectedGroup],
  )

  const selectedGroupStandings = groupStandings.get(selectedGroup) ?? []

  const selectedGroupR32 = useMemo(
    () =>
      resolveGroupR32Opponents(
        selectedGroup,
        selectedGroupStandings,
        groupStandings,
        groupProgress.done === groupProgress.total,
      ),
    [selectedGroup, selectedGroupStandings, groupStandings, groupProgress.done, groupProgress.total],
  )

  function applyGroupOverride(matchId: number, prediction: BracketSlotPrediction | null) {
    setOverrides((prev) => {
      const next = { ...prev }
      if (prediction == null) {
        delete next[matchId]
      } else {
        next[matchId] = prediction
      }

      for (const id of Object.keys(next).map(Number)) {
        if (id >= 73 && pendingMatchIds.has(id)) {
          delete next[id]
        }
      }

      return next
    })
  }

  function handleGroupOutcomeChange(matchId: number, outcome: GroupMatchOutcome | null) {
    applyGroupOverride(matchId, outcome == null ? null : outcomeToScores(outcome))
  }

  function handleGroupScoreChange(matchId: number, home: number | null, away: number | null) {
    if (home == null || away == null) {
      applyGroupOverride(matchId, null)
      return
    }
    applyGroupOverride(matchId, { predHome: home, predAway: away })
  }

  function handleApplyClassificationScenario(scenario: ClassificationScenario) {
    if (scenario.picks.length === 0) return

    const groupPendingIds = groupMatchRefs
      .filter((match) => match.group === selectedGroup && pendingMatchIds.has(match.id))
      .map((match) => match.id)

    setOverrides((prev) => {
      const next = { ...prev }

      for (const matchId of groupPendingIds) {
        delete next[matchId]
      }

      for (const pick of scenario.picks) {
        next[pick.matchId] = { predHome: pick.predHome, predAway: pick.predAway }
      }

      for (const id of Object.keys(next).map(Number)) {
        if (id >= 73 && pendingMatchIds.has(id)) {
          delete next[id]
        }
      }

      return next
    })
  }

  function handleKnockoutPredictionSaved(matchId: number, prediction: BracketSlotPrediction) {
    if (!pendingMatchIds.has(matchId)) return

    setOverrides((prev) => {
      const next = { ...prev, [matchId]: prediction }
      for (const id of getDownstreamKnockoutMatchIds(matchId)) {
        if (pendingMatchIds.has(id)) delete next[id]
      }
      return next
    })
  }

  function handleReset() {
    clearSimulatorOverrides()
    setOverrides({})
    setStep(1)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-brand-gold/25 bg-gradient-to-br from-brand-gold/10 via-card to-primary/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-brand-gold">
              <Sparkles className="size-3.5" aria-hidden />
              Escenario hipotético
            </p>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Los partidos finalizados quedan bloqueados con el resultado real. Editá los pendientes
              y mirá cómo cambian las tablas, los mejores terceros y la llave.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw data-icon="inline-start" aria-hidden />
            Limpiar simulaciones
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Resultados reales" value={groupProgress.finished} suffix="partidos" />
          <StatCard label="Simulados" value={groupProgress.simulated} suffix="partidos" />
          <StatCard label="Pendientes" value={groupProgress.pending} suffix="por definir" />
        </div>
      </div>

      <nav className="flex flex-wrap gap-2">
        {STEPS.map((entry) => (
          <Button
            key={entry.id}
            type="button"
            variant="outline"
            onClick={() => setStep(entry.id)}
            className={cn(
              'h-auto gap-2 rounded-full px-4 py-2',
              step === entry.id
                ? 'border-primary bg-primary/15 text-primary'
                : 'text-muted-foreground',
            )}
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs">
              {entry.id}
            </span>
            {entry.label}
            {entry.id === 1 && (
              <span className="text-xs opacity-70">
                {groupProgress.done}/{groupProgress.total}
              </span>
            )}
            {entry.id === 2 && (
              <span className="text-xs opacity-70">
                {knockoutProgress.done}/{knockoutProgress.total}
              </span>
            )}
          </Button>
        ))}
      </nav>

      {step === 1 && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {GROUPS.map((group) => {
              const standings = groupStandings.get(group) ?? []
              const leader = standings[0]
              const isSelected = selectedGroup === group
              const groupIds = groupMatchRefs.filter((match) => match.group === group).map((match) => match.id)
              const done = groupIds.filter((id) => predictions[id] != null).length

              return (
                <Button
                  key={group}
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedGroup(group)}
                  className={cn(
                    'h-auto w-full flex-col items-stretch rounded-xl p-3 text-left',
                    isSelected && 'border-primary bg-primary/10',
                    done === groupIds.length && done > 0 && 'border-brand-green/30',
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-heading text-sm tracking-wide text-primary">GRUPO {group}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {done}/{groupIds.length}
                    </span>
                  </div>
                  {leader?.team ? (
                    <div className="flex items-center gap-2">
                      <FlagIcon
                        iso2={leader.team.iso2}
                        flagEmoji={leader.team.flagEmoji}
                        size="sm"
                      />
                      <span className="truncate text-sm font-medium">{leader.team.nameEs}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{leader.points} pts</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sin datos aún</p>
                  )}
                </Button>
              )
            })}
          </div>

          {bestThirds.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 font-heading text-sm tracking-wide text-primary">
                MEJORES TERCEROS CLASIFICADOS
              </h3>
              <div className="flex flex-wrap gap-2">
                {bestThirds.map((standing) => (
                  <span
                    key={standing.teamName}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-medium"
                  >
                    {standing.team ? (
                      <FlagIcon
                        iso2={standing.team.iso2}
                        flagEmoji={standing.team.flagEmoji}
                        size="sm"
                      />
                    ) : null}
                    {standing.team?.nameEs ?? standing.teamName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {groupProgress.done < groupProgress.total && (
            <p className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Completá los partidos pendientes para ver los mejores terceros y desbloquear la llave
              completa.
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <GroupTable group={selectedGroup} standings={selectedGroupStandings} compact />
              <GroupR32OpponentsPanel
                group={selectedGroup}
                standings={selectedGroupStandings}
                projections={selectedGroupR32}
                allGroupsComplete={groupProgress.done === groupProgress.total}
              />
              <ClassificationScenariosPanel
                key={selectedGroup}
                group={selectedGroup}
                teams={selectedGroupTeams}
                standings={selectedGroupStandings}
                allTeams={teams}
                groupMatchRefs={selectedGroupMatchRefs}
                allGroupMatchRefs={groupMatchRefs}
                baseOverrides={effectiveOverrides}
                onApplyScenario={handleApplyClassificationScenario}
              />
            </div>

            <div className="space-y-2">
              {groupMatches
                .filter((match) => match.group === selectedGroup)
                .map((match) => {
                  const prediction = predictions[match.id]
                  return (
                    <SimulatorMatchRow
                      key={match.id}
                      matchId={match.id}
                      status={match.status}
                      homeScore={match.homeScore}
                      awayScore={match.awayScore}
                      home={{
                        name: match.homeTeam!.nameEs,
                        iso2: match.homeTeam!.iso2,
                        flagEmoji: match.homeTeam!.flagEmoji,
                      }}
                      away={{
                        name: match.awayTeam!.nameEs,
                        iso2: match.awayTeam!.iso2,
                        flagEmoji: match.awayTeam!.flagEmoji,
                      }}
                      simulatedHome={prediction?.predHome ?? null}
                      simulatedAway={prediction?.predAway ?? null}
                      onOutcomeChange={handleGroupOutcomeChange}
                      onScoreChange={handleGroupScoreChange}
                    />
                  )
                })}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={() => setStep(2)}>
              Ver eliminatorias
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <KnockoutBracketView
            teams={teams}
            resolvedKnockout={resolvedKnockout}
            predictions={predictions}
            editable
            groupsComplete={groupProgress.done === groupProgress.total}
            persistMode="local"
            isMatchLocked={(matchId) => !pendingMatchIds.has(matchId)}
            onPredictionSaved={handleKnockoutPredictionSaved}
          />

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Volver a grupos
            </Button>
            <Button type="button" onClick={() => setStep(3)}>
              Ver proyección
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Proyección según tu escenario simulado. No se guarda en tu Prode oficial.
          </p>

          {finalists.home && finalists.away ? (
            <div className="mx-auto grid max-w-2xl gap-4">
              <div className="grid grid-cols-2 gap-4">
                {[finalists.home, finalists.away].map((team) => {
                  const isChampion = finalists.champion?.id === team.id
                  return (
                    <div
                      key={team.id}
                      className={cn(
                        'flex flex-col items-center gap-3 rounded-xl border p-6',
                        isChampion
                          ? 'border-brand-gold bg-brand-gold/10 ring-2 ring-brand-gold/40'
                          : 'border-border bg-card',
                      )}
                    >
                      <FlagIcon iso2={team.iso2} flagEmoji={team.flagEmoji} size="lg" />
                      <span className="font-heading text-xl tracking-wide">{team.nameEs}</span>
                      {isChampion && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-gold">
                          <Trophy className="size-3.5" aria-hidden />
                          Campeón proyectado
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {!finalists.champion && (
                <p className="text-center text-sm text-muted-foreground">
                  Elegí un ganador en la final (M104) en Eliminatorias para ver al campeón proyectado.
                </p>
              )}
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
              Completá grupos y eliminatorias para ver la final proyectada.
            </p>
          )}

          <div className="flex justify-start">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              Volver a eliminatorias
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  suffix,
}: {
  label: string
  value: number
  suffix: string
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl tracking-wide text-foreground">
        {value}
        <span className="ml-1 text-sm font-normal text-muted-foreground">{suffix}</span>
      </p>
    </div>
  )
}

function decodeFinalChampion(
  prediction: BracketSlotPrediction,
  homeTeamId?: string | null,
  awayTeamId?: string | null,
) {
  if (prediction.predAdvancesTeamId) return prediction.predAdvancesTeamId
  if (!homeTeamId || !awayTeamId) return null
  if (prediction.predHome > prediction.predAway) return homeTeamId
  if (prediction.predAway > prediction.predHome) return awayTeamId
  return null
}
