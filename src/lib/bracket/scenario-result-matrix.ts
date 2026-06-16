import type { ScenarioMatchPick } from '@/lib/bracket/classification-scenarios'
import { isSimulatorMatchFinished, type SimulatorGroupMatchRef } from '@/lib/bracket/simulator'
import type { BracketSlotPrediction } from '@/lib/queries/bracket'

export type ScenarioMatrixCell = 'self' | 'win' | 'draw' | 'loss' | 'pending'

export type ScenarioMatrixTeam = {
  name: string
  nameEs: string
  iso2: string
  flagEmoji: string
}

export function resolveScenarioDisplayPredictions(
  groupMatchRefs: SimulatorGroupMatchRef[],
  scenarioPicks: ScenarioMatchPick[],
  baseOverrides: Record<number, BracketSlotPrediction> = {},
): Map<number, BracketSlotPrediction> {
  const pickById = new Map(scenarioPicks.map((pick) => [pick.matchId, pick]))
  const predictions = new Map<number, BracketSlotPrediction>()

  for (const match of groupMatchRefs) {
    if (isSimulatorMatchFinished(match)) {
      predictions.set(match.id, {
        predHome: match.homeScore!,
        predAway: match.awayScore!,
      })
      continue
    }

    const pick = pickById.get(match.id)
    if (pick) {
      predictions.set(match.id, { predHome: pick.predHome, predAway: pick.predAway })
      continue
    }

    const override = baseOverrides[match.id]
    if (override) {
      predictions.set(match.id, override)
    }
  }

  return predictions
}

export function buildScenarioProjectedOverrides(
  groupMatchRefs: SimulatorGroupMatchRef[],
  scenarioPicks: ScenarioMatchPick[],
): Record<number, BracketSlotPrediction> {
  const pickById = new Map(scenarioPicks.map((pick) => [pick.matchId, pick]))
  const overrides: Record<number, BracketSlotPrediction> = {}

  for (const match of groupMatchRefs) {
    if (isSimulatorMatchFinished(match)) continue

    const pick = pickById.get(match.id)
    if (pick) {
      overrides[match.id] = { predHome: pick.predHome, predAway: pick.predAway }
    }
  }

  return overrides
}

function findGroupMatch(
  groupMatchRefs: SimulatorGroupMatchRef[],
  teamA: string,
  teamB: string,
): SimulatorGroupMatchRef | undefined {
  return groupMatchRefs.find(
    (match) =>
      (match.homeName === teamA && match.awayName === teamB) ||
      (match.homeName === teamB && match.awayName === teamA),
  )
}

function resultFromRowPerspective(
  rowTeam: string,
  match: SimulatorGroupMatchRef,
  prediction: BracketSlotPrediction,
): Exclude<ScenarioMatrixCell, 'self' | 'pending'> {
  const rowIsHome = match.homeName === rowTeam
  const rowGoals = rowIsHome ? prediction.predHome : prediction.predAway
  const colGoals = rowIsHome ? prediction.predAway : prediction.predHome

  if (rowGoals > colGoals) return 'win'
  if (rowGoals === colGoals) return 'draw'
  return 'loss'
}

export function buildScenarioResultMatrix(
  teams: ScenarioMatrixTeam[],
  groupMatchRefs: SimulatorGroupMatchRef[],
  predictions: Map<number, BracketSlotPrediction>,
): ScenarioMatrixCell[][] {
  return teams.map((rowTeam, rowIndex) =>
    teams.map((colTeam, colIndex) => {
      if (rowIndex === colIndex) return 'self'

      const match = findGroupMatch(groupMatchRefs, rowTeam.name, colTeam.name)
      if (!match) return 'pending'

      const prediction = predictions.get(match.id)
      if (!prediction) return 'pending'

      return resultFromRowPerspective(rowTeam.name, match, prediction)
    }),
  )
}

export function scenarioMatrixCellLabel(cell: ScenarioMatrixCell): string {
  switch (cell) {
    case 'self':
      return '—'
    case 'win':
      return 'V'
    case 'draw':
      return 'E'
    case 'loss':
      return 'P'
    case 'pending':
      return '·'
  }
}

export function scenarioMatrixCellAriaLabel(
  rowTeam: ScenarioMatrixTeam,
  colTeam: ScenarioMatrixTeam,
  cell: ScenarioMatrixCell,
): string {
  if (cell === 'self') {
    return `${rowTeam.nameEs}: mismo equipo`
  }

  const opponent = colTeam.nameEs

  switch (cell) {
    case 'win':
      return `${rowTeam.nameEs} le gana a ${opponent}`
    case 'draw':
      return `${rowTeam.nameEs} empata con ${opponent}`
    case 'loss':
      return `${rowTeam.nameEs} pierde contra ${opponent}`
    case 'pending':
      return `${rowTeam.nameEs} vs ${opponent}: sin resultado`
  }
}
