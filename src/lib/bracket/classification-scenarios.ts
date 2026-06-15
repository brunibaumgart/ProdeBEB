import { getBestThirds, type Standing } from '@/lib/bracket'
import {
  formatGroupOutcomeLabel,
  outcomeToScores,
  type GroupMatchOutcome,
} from '@/lib/bracket/match-outcome'
import {
  isSimulatorMatchFinished,
  resolveGroupStandingsHybrid,
  type SimulatorGroupMatchRef,
} from '@/lib/bracket/simulator'
import type { BracketSlotPrediction } from '@/lib/queries/bracket'

export type ClassificationPosition = 1 | 2 | 3 | 'best_third'

export type ClassificationConstraint = {
  teamName: string
  position: ClassificationPosition
}

export type ScenarioMatchPick = {
  matchId: number
  outcome: GroupMatchOutcome
  predHome: number
  predAway: number
}

export type ClassificationScenario = {
  id: string
  picks: ScenarioMatchPick[]
  lines: string[]
}

export type FindClassificationScenariosResult =
  | {
      ok: true
      scenarios: ClassificationScenario[]
      explored: number
      pendingCount: number
    }
  | { ok: false; error: string }

const OUTCOMES: GroupMatchOutcome[] = ['home_win', 'draw', 'away_win']
const MAX_SCENARIOS = 12
const MAX_COMBINATIONS = 2187
const GROUPS = 'ABCDEFGHIJKL'.split('')
export const BEST_THIRD_MIN_MATCHDAY = 2

export function isGroupStageMatchdayComplete(
  matches: SimulatorGroupMatchRef[],
  throughMatchday: number,
): boolean {
  const scoped = matches.filter(
    (match) => match.matchday != null && match.matchday <= throughMatchday,
  )

  if (scoped.length === 0) return false

  return scoped.every(isSimulatorMatchFinished)
}

export function canUseBestThirdScenario(matches: SimulatorGroupMatchRef[]) {
  return isGroupStageMatchdayComplete(matches, BEST_THIRD_MIN_MATCHDAY)
}

type TeamRef = {
  name: string
  nameEs: string
  group: string
  iso2: string
  flagEmoji: string
}

type MatchLabelRef = {
  matchId: number
  homeName: string
  awayName: string
  homeDisplay: string
  awayDisplay: string
}

function constraintSlot(position: ClassificationPosition): 1 | 2 | 3 {
  return position === 'best_third' ? 3 : position
}

export function validateClassificationConstraints(
  constraints: ClassificationConstraint[],
  groupTeamNames: Set<string>,
): string | null {
  if (constraints.length === 0) {
    return 'Agregá al menos un objetivo.'
  }

  const usedSlots = new Set<number>()
  const teams = new Set<string>()

  for (const constraint of constraints) {
    if (!groupTeamNames.has(constraint.teamName)) {
      return 'Todos los equipos deben pertenecer al grupo seleccionado.'
    }
    if (teams.has(constraint.teamName)) {
      return 'No podés repetir el mismo equipo en dos objetivos.'
    }

    const slot = constraintSlot(constraint.position)
    if (usedSlots.has(slot)) {
      return 'No podés pedir dos equipos en la misma posición.'
    }

    teams.add(constraint.teamName)
    usedSlots.add(slot)
  }

  return null
}

function buildAllGroupStandings(
  teams: TeamRef[],
  allGroupMatches: SimulatorGroupMatchRef[],
  overrides: Record<number, BracketSlotPrediction>,
  targetGroup?: string,
  realOnlyOtherGroups = false,
): Map<string, Standing[]> {
  const map = new Map<string, Standing[]>()

  for (const group of GROUPS) {
    const groupOverrides =
      realOnlyOtherGroups && targetGroup != null && group !== targetGroup ? {} : overrides

    const groupTeams = teams.filter((team) => team.group === group)
    map.set(
      group,
      resolveGroupStandingsHybrid(groupTeams, allGroupMatches, groupOverrides, group),
    )
  }

  return map
}

function buildScenarioOverridesForTargetGroup(
  picks: ScenarioMatchPick[],
): Record<number, BracketSlotPrediction> {
  const overrides: Record<number, BracketSlotPrediction> = {}

  for (const pick of picks) {
    overrides[pick.matchId] = { predHome: pick.predHome, predAway: pick.predAway }
  }

  return overrides
}

function satisfiesConstraints(
  groupStandings: Standing[],
  allGroupStandings: Map<string, Standing[]>,
  constraints: ClassificationConstraint[],
) {
  const bestThirds = getBestThirds(allGroupStandings, 8)
  const bestThirdNames = new Set(bestThirds.map((standing) => standing.teamName))

  return constraints.every((constraint) => {
    const index = groupStandings.findIndex((standing) => standing.teamName === constraint.teamName)
    if (index < 0) return false

    if (constraint.position === 'best_third') {
      return index === 2 && bestThirdNames.has(constraint.teamName)
    }

    return index === constraint.position - 1
  })
}

function buildScenarioId(picks: ScenarioMatchPick[]) {
  return picks
    .slice()
    .sort((a, b) => a.matchId - b.matchId)
    .map((pick) => `${pick.matchId}:${pick.outcome}`)
    .join('|')
}

function buildScenarioLines(
  picks: ScenarioMatchPick[],
  matchLabels: Map<number, MatchLabelRef>,
  constraints: ClassificationConstraint[],
) {
  const lines = picks.map((pick) => {
    const match = matchLabels.get(pick.matchId)
    if (!match) return `M${pick.matchId}`

    const outcomeLabel = formatGroupOutcomeLabel(
      pick.outcome,
      match.homeDisplay,
      match.awayDisplay,
    )

    return `${outcomeLabel} · ${match.homeDisplay} vs ${match.awayDisplay} (M${pick.matchId})`
  })

  if (constraints.some((constraint) => constraint.position === 'best_third')) {
    lines.push(
      'Compara contra resultados reales de los otros grupos (sin simulaciones ajenas al grupo).',
    )
  }

  return lines
}

function buildScenarioOverrides(
  allGroupMatches: SimulatorGroupMatchRef[],
  group: string,
  baseOverrides: Record<number, BracketSlotPrediction>,
  picks: ScenarioMatchPick[],
): Record<number, BracketSlotPrediction> {
  const overrides = { ...baseOverrides }

  for (const match of allGroupMatches) {
    if (match.group === group && !isSimulatorMatchFinished(match)) {
      delete overrides[match.id]
    }
  }

  for (const pick of picks) {
    overrides[pick.matchId] = { predHome: pick.predHome, predAway: pick.predAway }
  }

  return overrides
}

export function findClassificationScenarios({
  teams,
  allGroupMatches,
  group,
  constraints,
  matchLabels,
  baseOverrides = {},
}: {
  teams: TeamRef[]
  allGroupMatches: SimulatorGroupMatchRef[]
  group: string
  constraints: ClassificationConstraint[]
  matchLabels: Map<number, MatchLabelRef>
  baseOverrides?: Record<number, BracketSlotPrediction>
}): FindClassificationScenariosResult {
  const groupTeams = teams.filter((team) => team.group === group)
  const groupTeamNames = new Set(groupTeams.map((team) => team.name))
  const validationError = validateClassificationConstraints(constraints, groupTeamNames)
  if (validationError) {
    return { ok: false, error: validationError }
  }

  const usesBestThird = constraints.some((constraint) => constraint.position === 'best_third')
  if (usesBestThird && !canUseBestThirdScenario(allGroupMatches)) {
    return {
      ok: false,
      error:
        'La opción «3° y entre los 8 mejores terceros» se habilita cuando termina la fecha 2 del torneo.',
    }
  }

  const pendingMatches = allGroupMatches
    .filter((match) => match.group === group && !isSimulatorMatchFinished(match))
    .sort((a, b) => a.id - b.id)

  const combinations = 3 ** pendingMatches.length
  if (combinations > MAX_COMBINATIONS) {
    return {
      ok: false,
      error: 'Hay demasiados partidos pendientes para explorar todas las combinaciones.',
    }
  }

  if (pendingMatches.length === 0) {
    const overrides = usesBestThird ? {} : baseOverrides
    const groupStandings = resolveGroupStandingsHybrid(
      groupTeams,
      allGroupMatches,
      overrides,
      group,
    )
    const allGroupStandings = buildAllGroupStandings(
      teams,
      allGroupMatches,
      overrides,
      group,
      usesBestThird,
    )

    if (!satisfiesConstraints(groupStandings, allGroupStandings, constraints)) {
      return {
        ok: false,
        error: 'No quedan partidos pendientes y la tabla actual no cumple ese objetivo.',
      }
    }

    return {
      ok: true,
      scenarios: [
        {
          id: 'already-satisfied',
          picks: [],
          lines: ['Ya se cumple con los resultados actuales del grupo.'],
        },
      ],
      explored: 1,
      pendingCount: 0,
    }
  }

  const scenarios: ClassificationScenario[] = []
  const seen = new Set<string>()
  let explored = 0

  function search(matchIndex: number, picks: ScenarioMatchPick[]) {
    if (scenarios.length >= MAX_SCENARIOS) return

    if (matchIndex === pendingMatches.length) {
      explored += 1
      const overrides = usesBestThird
        ? buildScenarioOverridesForTargetGroup(picks)
        : buildScenarioOverrides(allGroupMatches, group, baseOverrides, picks)
      const groupStandings = resolveGroupStandingsHybrid(
        groupTeams,
        allGroupMatches,
        overrides,
        group,
      )
      const allGroupStandings = buildAllGroupStandings(
        teams,
        allGroupMatches,
        overrides,
        group,
        usesBestThird,
      )

      if (!satisfiesConstraints(groupStandings, allGroupStandings, constraints)) return

      const id = buildScenarioId(picks)
      if (seen.has(id)) return
      seen.add(id)

      scenarios.push({
        id,
        picks,
        lines: buildScenarioLines(picks, matchLabels, constraints),
      })
      return
    }

    const match = pendingMatches[matchIndex]
    for (const outcome of OUTCOMES) {
      const { predHome, predAway } = outcomeToScores(outcome)
      search(matchIndex + 1, [
        ...picks,
        { matchId: match.id, outcome, predHome, predAway },
      ])
      if (scenarios.length >= MAX_SCENARIOS) return
    }
  }

  search(0, [])

  if (scenarios.length === 0) {
    const needsBestThird = constraints.some((constraint) => constraint.position === 'best_third')
    return {
      ok: false,
      error: needsBestThird
        ? 'No encontramos escenarios donde quede 3° y clasifique entre los 8 mejores terceros.'
        : 'No encontramos escenarios con victoria/empate en los partidos pendientes.',
    }
  }

  return {
    ok: true,
    scenarios,
    explored,
    pendingCount: pendingMatches.length,
  }
}

export function positionLabel(position: ClassificationPosition) {
  switch (position) {
    case 1:
      return '1° del grupo'
    case 2:
      return '2° del grupo'
    case 3:
      return '3° del grupo'
    case 'best_third':
      return '3° y entre los 8 mejores terceros'
  }
}

export function constraintSlotForValidation(position: ClassificationPosition) {
  return constraintSlot(position)
}
