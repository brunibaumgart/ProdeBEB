/** Puntos por goleador acertado según posición (Fecha a Fecha). */
export const SCORER_POINTS_BY_POSITION: Record<string, number> = {
  Portero: 10,
  Defensa: 5,
  Mediocampista: 2,
  Delantero: 1,
}

export const OWN_GOAL_SENTINEL = '__own_goal__'
export const OWN_GOAL_POINTS = 5

/** Orden del selector de goleadores: DEL → MED → DEF → POR */
const SCORER_PICKER_POSITION_ORDER = [
  'Delantero',
  'Mediocampista',
  'Defensa',
  'Portero',
] as const

export interface ScorerGoalEntry {
  playerId: string | null
  isOwnGoal: boolean
  isHome: boolean
}

export function isOwnGoalSentinel(value: string): boolean {
  return value === OWN_GOAL_SENTINEL
}

export function scorerSlotToId(entry: { playerId: string | null; isOwnGoal: boolean }): string {
  if (entry.isOwnGoal) return OWN_GOAL_SENTINEL
  return entry.playerId ?? ''
}

export function scorerSlotFromId(id: string): Pick<ScorerGoalEntry, 'playerId' | 'isOwnGoal'> {
  if (isOwnGoalSentinel(id)) {
    return { playerId: null, isOwnGoal: true }
  }
  return { playerId: id, isOwnGoal: false }
}

export function sortPlayersForScorerPicker<T extends { position: string; name: string }>(
  players: T[]
): T[] {
  const rank = new Map<string, number>(
    SCORER_PICKER_POSITION_ORDER.map((position, index) => [position, index])
  )

  return [...players].sort((a, b) => {
    const posA = rank.get(a.position) ?? 99
    const posB = rank.get(b.position) ?? 99
    if (posA !== posB) return posA - posB
    return a.name.localeCompare(b.name, 'es')
  })
}

export function adjustScorersToCount(scorerIds: string[], goalCount: number): string[] {
  // Solo al guardar: recorta goles sobrantes si el marcador final es menor.
  return scorerIds.slice(0, goalCount)
}

export function getScorerPointsForPosition(position: string): number {
  return SCORER_POINTS_BY_POSITION[position] ?? 0
}

export function calculateScorerPoints(
  predicted: ScorerGoalEntry[],
  actual: ScorerGoalEntry[],
  positionByPlayerId: Map<string, string>
): number {
  let total = 0

  const actualPlayerIds = new Set(
    actual.filter((goal) => !goal.isOwnGoal && goal.playerId).map((goal) => goal.playerId!)
  )

  for (const scorer of predicted) {
    if (scorer.isOwnGoal || !scorer.playerId) continue
    if (!actualPlayerIds.has(scorer.playerId)) continue
    const position = positionByPlayerId.get(scorer.playerId)
    if (position) total += getScorerPointsForPosition(position)
  }

  for (const isHome of [true, false] as const) {
    const predictedOwnGoals = predicted.filter((goal) => goal.isOwnGoal && goal.isHome === isHome).length
    const actualOwnGoals = actual.filter((goal) => goal.isOwnGoal && goal.isHome === isHome).length
    total += Math.min(predictedOwnGoals, actualOwnGoals) * OWN_GOAL_POINTS
  }

  return total
}

export function validateScorerCounts(
  homeScore: number,
  awayScore: number,
  homeScorerIds: string[],
  awayScorerIds: string[]
): string | null {
  if (homeScorerIds.length !== homeScore) {
    return `Elegí ${homeScore} goleador${homeScore === 1 ? '' : 'es'} local${homeScore === 1 ? '' : 'es'}.`
  }
  if (awayScorerIds.length !== awayScore) {
    return `Elegí ${awayScore} goleador${awayScore === 1 ? '' : 'es'} visitante${awayScore === 1 ? '' : 'es'}.`
  }
  return null
}

/** Goleadores opcionales: si hay goles, podés omitirlos (0 pts) o completarlos. */
export function validateOptionalScorerCounts(
  homeScore: number,
  awayScore: number,
  homeScorerIds: string[],
  awayScorerIds: string[]
): string | null {
  if (homeScorerIds.length > homeScore) {
    return `Demasiados goleadores locales (máx. ${homeScore}).`
  }
  if (awayScorerIds.length > awayScore) {
    return `Demasiados goleadores visitantes (máx. ${awayScore}).`
  }
  if (homeScorerIds.some((id) => !id) || awayScorerIds.some((id) => !id)) {
    return 'Completá todos los goleadores seleccionados.'
  }
  return null
}

export function formatScorerSlotLabel(id: string, playerName?: string | null): string {
  if (isOwnGoalSentinel(id) || !playerName) return 'Autogol'
  return playerName
}
