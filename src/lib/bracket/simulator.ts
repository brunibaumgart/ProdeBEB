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

export type GroupMatchNavRef = Pick<
  SimulatorMatchRef,
  'id' | 'status' | 'homeScore' | 'awayScore'
> & {
  date?: string | Date | null
}

/** Índice del próximo partido real pendiente; si todos terminaron, el último del grupo. */
export function findNextGroupMatchIndex(matches: GroupMatchNavRef[]): number {
  if (matches.length === 0) return 0

  const ordered = [...matches].sort((a, b) => {
    const timeA = a.date ? new Date(a.date).getTime() : a.id
    const timeB = b.date ? new Date(b.date).getTime() : b.id
    if (timeA !== timeB) return timeA - timeB
    return a.id - b.id
  })

  const nextMatch = ordered.find((match) => !isSimulatorMatchFinished(match))
  if (!nextMatch) return matches.length - 1

  const index = matches.findIndex((match) => match.id === nextMatch.id)
  return index >= 0 ? index : 0
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

const CLINCH_OUTCOMES = [
  { predHome: 1, predAway: 0 },
  { predHome: 1, predAway: 1 },
  { predHome: 0, predAway: 1 },
] as const

/**
 * Returns standings where only positions clinched across ALL possible outcomes
 * for remaining matches are included. Uses real results for finished matches
 * and enumerates all 3^n combinations for pending ones.
 */
export function resolveClinichedGroupPositionsFromRefs(
  teams: { name: string; nameEs: string; iso2: string; flagEmoji: string }[],
  groupMatchRefs: SimulatorGroupMatchRef[],
  group: string,
): Standing[] {
  const gMatches = groupMatchRefs.filter((m) => m.group === group)
  const finished = gMatches.filter((m) => isSimulatorMatchFinished(m))
  const pending = gMatches.filter((m) => !isSimulatorMatchFinished(m))

  if (finished.length === 0) return []

  const baseMatches = gMatches.map((m) => ({
    matchId: m.id,
    group: m.group,
    homeName: m.homeName,
    awayName: m.awayName,
  }))

  const basePredictions: Record<number, { predHome: number; predAway: number }> = {}
  for (const m of finished) {
    basePredictions[m.id] = { predHome: m.homeScore!, predAway: m.awayScore! }
  }

  const allScenarios: Standing[][] = []

  function enumerate(idx: number, extra: Record<number, { predHome: number; predAway: number }>) {
    if (idx === pending.length) {
      allScenarios.push(
        resolveGroupStandingsFromPredictions(teams, baseMatches, { ...basePredictions, ...extra }, group),
      )
      return
    }
    const m = pending[idx]
    for (const outcome of CLINCH_OUTCOMES) {
      enumerate(idx + 1, { ...extra, [m.id]: outcome })
    }
  }

  enumerate(0, {})

  const result: Standing[] = []
  for (let pos = 0; pos < teams.length; pos++) {
    const first = allScenarios[0]?.[pos]
    if (first && allScenarios.every((s) => s[pos]?.teamName === first.teamName)) {
      result[pos] = first
    }
  }
  return result
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
