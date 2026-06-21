'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Search, Target } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { FieldSelect } from '@/components/ui/select'
import { ClassificationScenarioCard } from '@/components/simulator/classification-scenario-card'
import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import {
  canUseBestThirdScenario,
  constraintSlotForValidation,
  findClassificationScenarios,
  positionLabel,
  type ClassificationConstraint,
  type ClassificationPosition,
  type ClassificationScenario,
  type FindClassificationScenariosResult,
} from '@/lib/bracket/classification-scenarios'
import type { BracketSlotPrediction } from '@/lib/queries/bracket'
import type { SimulatorGroupMatchRef } from '@/lib/bracket/simulator'
import type { Standing } from '@/lib/bracket'
import { cn } from '@/lib/utils'

type GroupTeam = {
  name: string
  nameEs: string
  group: string
  iso2: string
  flagEmoji: string
}

interface ClassificationScenariosPanelProps {
  group: string
  teams: GroupTeam[]
  standings: Standing[]
  allTeams: GroupTeam[]
  groupMatchRefs: SimulatorGroupMatchRef[]
  allGroupMatchRefs: SimulatorGroupMatchRef[]
  baseOverrides: Record<number, BracketSlotPrediction>
  onApplyScenario: (scenario: ClassificationScenario) => void
  embedded?: boolean
  showHeader?: boolean
  modal?: boolean
  className?: string
}

type ConstraintDraft = {
  teamName: string
  position: ClassificationPosition
}

const BASE_POSITIONS: ClassificationPosition[] = [1, 2, 3]

function buildPositionOptions(
  bestThirdAvailable: boolean,
  disabledPositions: number[],
) {
  const positions: ClassificationPosition[] = bestThirdAvailable
    ? [...BASE_POSITIONS, 'best_third']
    : BASE_POSITIONS

  return positions.map((position) => ({
    value: position,
    label: positionLabel(position),
    disabled: disabledPositions.includes(constraintSlotForValidation(position)),
  }))
}

function buildMatchLabels(
  groupMatchRefs: SimulatorGroupMatchRef[],
  teams: GroupTeam[],
): Map<
  number,
  {
    matchId: number
    homeName: string
    awayName: string
    homeDisplay: string
    awayDisplay: string
  }
> {
  const displayByName = new Map(teams.map((team) => [team.name, team.nameEs]))
  const labels = new Map<
    number,
    {
      matchId: number
      homeName: string
      awayName: string
      homeDisplay: string
      awayDisplay: string
    }
  >()

  for (const match of groupMatchRefs) {
    labels.set(match.id, {
      matchId: match.id,
      homeName: match.homeName,
      awayName: match.awayName,
      homeDisplay: displayByName.get(match.homeName) ?? match.homeName,
      awayDisplay: displayByName.get(match.awayName) ?? match.awayName,
    })
  }

  return labels
}

function teamForPosition(
  standings: Standing[],
  teams: GroupTeam[],
  position: ClassificationPosition,
): string {
  const index = position === 'best_third' ? 2 : position - 1
  return standings[index]?.teamName ?? teams[index]?.name ?? teams[0]?.name ?? ''
}

function buildConstraintDraft(
  standings: Standing[],
  teams: GroupTeam[],
  position: ClassificationPosition,
): ConstraintDraft {
  return {
    position,
    teamName: teamForPosition(standings, teams, position),
  }
}

export function ClassificationScenariosPanel({
  group,
  teams,
  standings,
  allTeams,
  groupMatchRefs,
  allGroupMatchRefs,
  baseOverrides,
  onApplyScenario,
  embedded = false,
  showHeader = true,
  modal = false,
  className,
}: ClassificationScenariosPanelProps) {
  const [primary, setPrimary] = useState<ConstraintDraft>(() =>
    buildConstraintDraft(standings, teams, 1),
  )
  const [secondaryEnabled, setSecondaryEnabled] = useState(false)
  const [secondary, setSecondary] = useState<ConstraintDraft>(() =>
    buildConstraintDraft(standings, teams, 2),
  )
  const [tertiaryEnabled, setTertiaryEnabled] = useState(false)
  const [tertiary, setTertiary] = useState<ConstraintDraft>(() =>
    buildConstraintDraft(standings, teams, 3),
  )
  const [result, setResult] = useState<FindClassificationScenariosResult | null>(null)
  const [appliedScenarioId, setAppliedScenarioId] = useState<string | null>(null)

  const bestThirdAvailable = useMemo(
    () => canUseBestThirdScenario(allGroupMatchRefs),
    [allGroupMatchRefs],
  )

  const matchLabels = useMemo(
    () => buildMatchLabels(groupMatchRefs, teams),
    [groupMatchRefs, teams],
  )

  const activeConstraints = useMemo(() => {
    const constraints: ClassificationConstraint[] = [primary]
    if (secondaryEnabled) constraints.push(secondary)
    if (tertiaryEnabled) constraints.push(tertiary)
    return constraints
  }, [primary, secondary, secondaryEnabled, tertiary, tertiaryEnabled])

  const usedTeamNames = activeConstraints.map((constraint) => constraint.teamName)
  const usedSlots = activeConstraints.map((constraint) =>
    constraintSlotForValidation(constraint.position),
  )

  useEffect(() => {
    if (bestThirdAvailable) return

    setPrimary((prev) => (prev.position === 'best_third' ? { ...prev, position: 3 } : prev))
    setSecondary((prev) => (prev.position === 'best_third' ? { ...prev, position: 3 } : prev))
    setTertiary((prev) => (prev.position === 'best_third' ? { ...prev, position: 3 } : prev))
  }, [bestThirdAvailable])

  function handleSearch() {
    setAppliedScenarioId(null)
    setResult(
      findClassificationScenarios({
        teams: allTeams,
        allGroupMatches: allGroupMatchRefs,
        group,
        constraints: activeConstraints,
        matchLabels,
        baseOverrides,
      }),
    )
  }

  function handleApply(scenario: ClassificationScenario) {
    if (scenario.picks.length === 0) return
    onApplyScenario(scenario)
    setAppliedScenarioId(scenario.id)
  }

  const panelContent = (
      <div className={cn('space-y-4', modal ? '' : cn('px-4', embedded ? 'py-3' : 'py-4'))}>
        <ConstraintRow
          label="Objetivo principal"
          teams={teams}
          standings={standings}
          value={primary}
          onChange={setPrimary}
          bestThirdAvailable={bestThirdAvailable}
          disabledTeamNames={usedTeamNames.filter((name) => name !== primary.teamName)}
          disabledPositions={usedSlots.filter(
            (slot) => slot !== constraintSlotForValidation(primary.position),
          )}
        />

        <Label className="cursor-pointer text-xs font-normal text-muted-foreground">
          <Checkbox
            checked={secondaryEnabled}
            onCheckedChange={(checked) => {
              const enabled = checked === true
              setSecondaryEnabled(enabled)
              if (enabled) {
                setSecondary(buildConstraintDraft(standings, teams, 2))
              }
            }}
          />
          Agregar segundo objetivo
        </Label>

        {secondaryEnabled && (
          <ConstraintRow
            label="Segundo objetivo"
            teams={teams}
            standings={standings}
            value={secondary}
            onChange={setSecondary}
            bestThirdAvailable={bestThirdAvailable}
            disabledTeamNames={usedTeamNames.filter((name) => name !== secondary.teamName)}
            disabledPositions={usedSlots.filter(
              (slot) => slot !== constraintSlotForValidation(secondary.position),
            )}
          />
        )}

        <Label className="cursor-pointer text-xs font-normal text-muted-foreground">
          <Checkbox
            checked={tertiaryEnabled}
            onCheckedChange={(checked) => {
              const enabled = checked === true
              setTertiaryEnabled(enabled)
              if (enabled) {
                setTertiary(buildConstraintDraft(standings, teams, 3))
              }
            }}
          />
          Agregar tercer objetivo
        </Label>

        {tertiaryEnabled && (
          <ConstraintRow
            label="Tercer objetivo"
            teams={teams}
            standings={standings}
            value={tertiary}
            onChange={setTertiary}
            bestThirdAvailable={bestThirdAvailable}
            disabledTeamNames={usedTeamNames.filter((name) => name !== tertiary.teamName)}
            disabledPositions={usedSlots.filter(
              (slot) => slot !== constraintSlotForValidation(tertiary.position),
            )}
          />
        )}

        <Button type="button" onClick={handleSearch} disabled={teams.length === 0} className="w-full">
          <Search data-icon="inline-start" aria-hidden />
          Buscar escenarios
        </Button>

        {result && !result.ok && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {result.error}
          </p>
        )}

        {result?.ok && (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {result.scenarios.length} escenario{result.scenarios.length === 1 ? '' : 's'} ·{' '}
              {result.pendingCount} partido{result.pendingCount === 1 ? '' : 's'} pendiente
              {result.pendingCount === 1 ? '' : 's'}
              <span className="hidden sm:inline">
                {' '}
                · {result.explored} combinaciones revisadas
              </span>
            </p>

            <div className="space-y-3">
              {result.scenarios.map((scenario, index) => {
                const isApplied = appliedScenarioId === scenario.id
                return (
                  <div
                    key={scenario.id}
                    className={cn(
                      'overflow-hidden rounded-xl border border-border/60 bg-card transition-colors',
                      isApplied && 'ring-1 ring-primary/20',
                    )}
                  >
                    <ClassificationScenarioCard
                      group={group}
                      teams={teams}
                      groupMatchRefs={groupMatchRefs}
                      scenario={scenario}
                      className="p-3 pb-2"
                    />

                    <div className="flex items-center justify-between gap-3 border-t border-border/50 bg-muted/10 px-3 py-2.5">
                      <span className="text-[11px] text-muted-foreground">
                        Escenario {index + 1}
                        {isApplied ? (
                          <span className="ml-1.5 inline-flex items-center gap-1 text-primary">
                            <Check className="size-3" aria-hidden />
                            aplicado
                          </span>
                        ) : null}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant={isApplied ? 'outline' : 'default'}
                        onClick={() => handleApply(scenario)}
                        disabled={scenario.picks.length === 0}
                        className="h-8 shrink-0 px-3 text-xs"
                      >
                        {isApplied ? 'Reaplicar' : 'Aplicar'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
  )

  if (modal) {
    return <div className={className}>{panelContent}</div>
  }

  return (
    <div
      className={cn(
        embedded
          ? 'border-t border-border bg-muted/15'
          : 'overflow-hidden rounded-xl border border-border bg-card',
        className,
      )}
    >
      {showHeader && (
        <div
          className={cn(
            'border-border bg-muted/40 px-4',
            embedded ? 'border-b py-2.5' : 'border-b py-3',
          )}
        >
          <h3 className="inline-flex items-center gap-2 font-heading text-sm tracking-wide text-primary">
            <Target className="size-4" aria-hidden />
            ¿QUÉ TIENE QUE PASAR?
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {embedded
              ? 'Buscá escenarios en los partidos pendientes (gana local, empate o gana visitante).'
              : 'Buscá escenarios en los partidos pendientes (gana local, empate o gana visitante). Desempates con criterio olímpico. Para 8 mejores terceros, compara contra resultados reales de los otros grupos (disponible desde la fecha 2).'}
          </p>
          {!bestThirdAvailable && !embedded && (
            <p className="mt-2 text-xs text-muted-foreground">
              La opción de mejores terceros se habilita cuando terminen todos los partidos de la
              fecha 2.
            </p>
          )}
        </div>
      )}

      {panelContent}
    </div>
  )
}

function ConstraintRow({
  label,
  teams,
  standings,
  value,
  onChange,
  bestThirdAvailable,
  disabledTeamNames = [],
  disabledPositions = [],
}: {
  label: string
  teams: GroupTeam[]
  standings: Standing[]
  value: ConstraintDraft
  onChange: (value: ConstraintDraft) => void
  bestThirdAvailable: boolean
  disabledTeamNames?: string[]
  disabledPositions?: number[]
}) {
  const selectedTeam = teams.find((team) => team.name === value.teamName)

  const teamOptions = teams.map((team) => ({
    value: team.name,
    label: team.nameEs,
    disabled: disabledTeamNames.includes(team.name),
  }))

  const positionOptions = buildPositionOptions(bestThirdAvailable, disabledPositions)

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        <FieldSelect
          value={value.teamName}
          onValueChange={(teamName) => onChange({ ...value, teamName })}
          options={teamOptions}
          aria-label="Equipo objetivo"
        />

        <FieldSelect
          value={value.position}
          onValueChange={(position) =>
            onChange({
              position,
              teamName: teamForPosition(standings, teams, position),
            })
          }
          options={positionOptions}
          aria-label="Posición objetivo"
        />
      </div>

      {selectedTeam && (
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <FlagIcon iso2={selectedTeam.iso2} flagEmoji={selectedTeam.flagEmoji} size="sm" />
          Objetivo: {positionLabel(value.position)}
        </div>
      )}
    </div>
  )
}
