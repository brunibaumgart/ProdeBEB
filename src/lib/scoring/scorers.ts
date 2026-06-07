/** Puntos por goleador acertado según posición (Fecha a Fecha). */
export const SCORER_POINTS_BY_POSITION: Record<string, number> = {
  Portero: 10,
  Defensa: 5,
  Mediocampista: 2,
  Delantero: 1,
}

/** Orden del selector de goleadores: DEL → MED → DEF → POR */
const SCORER_PICKER_POSITION_ORDER = [
  'Delantero',
  'Mediocampista',
  'Defensa',
  'Portero',
] as const

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
  predictedPlayerIds: string[],
  actualPlayerIds: Set<string>,
  positionByPlayerId: Map<string, string>
): number {
  let total = 0

  for (const playerId of predictedPlayerIds) {
    if (!actualPlayerIds.has(playerId)) continue
    const position = positionByPlayerId.get(playerId)
    if (position) total += getScorerPointsForPosition(position)
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
