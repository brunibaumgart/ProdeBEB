import {
  getBestThirds,
  resolveGroupStandingsFromPredictions,
  type Standing,
} from '@/lib/bracket'
import type { BracketSlotPrediction } from '@/lib/queries/bracket'

export type SimulatorMatchRef = {
  id: number
  status: string
  group?: string | null
  homeScore: number | null
  awayScore: number | null
  homeTeamId?: string | null
  awayTeamId?: string | null
  homeName: string
  awayName: string
}

export type SimulatorGroupMatchRef = SimulatorMatchRef & {
  group: string
  matchday?: number | null
}

const STORAGE_KEY = 'prode-simulator-overrides-v1'

export function isSimulatorMatchFinished(match: Pick<SimulatorMatchRef, 'status' | 'homeScore' | 'awayScore'>) {
  return match.status === 'finished' && match.homeScore != null && match.awayScore != null
}

export function buildSimulatorBasePredictions(
  matches: SimulatorMatchRef[],
): Record<number, BracketSlotPrediction> {
  const result: Record<number, BracketSlotPrediction> = {}

  for (const match of matches) {
    if (!isSimulatorMatchFinished(match)) continue

    const prediction: BracketSlotPrediction = {
      predHome: match.homeScore!,
      predAway: match.awayScore!,
    }

    if (match.homeTeamId && match.awayTeamId) {
      if (match.homeScore! > match.awayScore!) {
        prediction.predAdvancesTeamId = match.homeTeamId
      } else if (match.awayScore! > match.homeScore!) {
        prediction.predAdvancesTeamId = match.awayTeamId
      }
      prediction.predDecidedIn = 'regulation'
    }

    result[match.id] = prediction
  }

  return result
}

export function buildEffectiveSimulatorPredictions(
  basePredictions: Record<number, BracketSlotPrediction>,
  overrides: Record<number, BracketSlotPrediction>,
): Record<number, BracketSlotPrediction> {
  return { ...basePredictions, ...overrides }
}

export function resolveGroupStandingsHybrid(
  teams: { name: string; nameEs: string; iso2: string; flagEmoji: string }[],
  matches: SimulatorGroupMatchRef[],
  overrides: Record<number, BracketSlotPrediction>,
  group: string,
): Standing[] {
  const effectivePredictions: Record<number, { predHome: number; predAway: number }> = {}

  for (const match of matches.filter((entry) => entry.group === group)) {
    if (isSimulatorMatchFinished(match)) {
      effectivePredictions[match.id] = {
        predHome: match.homeScore!,
        predAway: match.awayScore!,
      }
      continue
    }

    const override = overrides[match.id]
    if (override != null) {
      effectivePredictions[match.id] = {
        predHome: override.predHome,
        predAway: override.predAway,
      }
    }
  }

  return resolveGroupStandingsFromPredictions(
    teams,
    matches.map((match) => ({
      matchId: match.id,
      group: match.group,
      homeName: match.homeName,
      awayName: match.awayName,
    })),
    effectivePredictions,
    group,
  )
}

export function getSimulatorGroupProgress(
  groupMatches: SimulatorGroupMatchRef[],
  overrides: Record<number, BracketSlotPrediction>,
) {
  const total = groupMatches.length
  const done = groupMatches.filter(
    (match) => isSimulatorMatchFinished(match) || overrides[match.id] != null,
  ).length
  const finished = groupMatches.filter((match) => isSimulatorMatchFinished(match)).length
  const simulated = groupMatches.filter(
    (match) => !isSimulatorMatchFinished(match) && overrides[match.id] != null,
  ).length
  const pending = total - done

  return { total, done, finished, simulated, pending }
}

export function getSimulatorBestThirds(
  groupStandings: Map<string, Standing[]>,
  groupMatches: SimulatorGroupMatchRef[],
  overrides: Record<number, BracketSlotPrediction>,
) {
  const progress = getSimulatorGroupProgress(groupMatches, overrides)
  if (progress.done < progress.total) return []

  return getBestThirds(groupStandings, 8)
}

export function loadSimulatorOverrides(): Record<number, BracketSlotPrediction> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<number, BracketSlotPrediction>
  } catch {
    return {}
  }
}

export function saveSimulatorOverrides(overrides: Record<number, BracketSlotPrediction>) {
  if (typeof window === 'undefined') return

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    // sessionStorage puede fallar en modo privado estricto
  }
}

export function clearSimulatorOverrides() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(STORAGE_KEY)
}

export function pruneSimulatorOverrides(
  overrides: Record<number, BracketSlotPrediction>,
  pendingMatchIds: Set<number>,
): Record<number, BracketSlotPrediction> {
  const next: Record<number, BracketSlotPrediction> = {}
  for (const [matchIdStr, prediction] of Object.entries(overrides)) {
    const matchId = Number(matchIdStr)
    if (pendingMatchIds.has(matchId)) {
      next[matchId] = prediction
    }
  }
  return next
}
