/**
 * Para partidos de eliminación directa cuyo rival todavía no está definido (p. ej. "Ganador M84"),
 * calcula qué equipos siguen vivos y podrían terminar ocupando ese cruce, recorriendo hacia atrás
 * la cadena homeFromMatchId/awayFromMatchId hasta llegar a partidos ya resueltos (con equipo real
 * asignado) o finalizados. Cuando un partido de origen termina, se colapsa a un único candidato
 * (el ganador o perdedor según corresponda) y ese equipo eliminado deja de propagarse hacia adelante.
 */
export interface MatchForSlotCandidates {
  id: number
  homeTeamId: string | null
  awayTeamId: string | null
  homeScore: number | null
  awayScore: number | null
  status: string
  penaltiesWinnerId: string | null
  homeFromMatchId: number | null
  awayFromMatchId: number | null
  homeFromPosition: string | null
  awayFromPosition: string | null
}

export interface SlotCandidates {
  home: string[]
  away: string[]
}

function getWinnerLoser(match: MatchForSlotCandidates): { winnerId: string | null; loserId: string | null } {
  const { homeTeamId, awayTeamId, homeScore, awayScore, penaltiesWinnerId } = match
  if (match.status !== 'finished' || !homeTeamId || !awayTeamId || homeScore == null || awayScore == null) {
    return { winnerId: null, loserId: null }
  }
  if (homeScore > awayScore) return { winnerId: homeTeamId, loserId: awayTeamId }
  if (awayScore > homeScore) return { winnerId: awayTeamId, loserId: homeTeamId }
  if (penaltiesWinnerId) {
    return {
      winnerId: penaltiesWinnerId,
      loserId: penaltiesWinnerId === homeTeamId ? awayTeamId : homeTeamId,
    }
  }
  return { winnerId: null, loserId: null }
}

function dedupe(ids: string[]): string[] {
  return [...new Set(ids)]
}

export function resolveKnockoutSlotCandidates(
  matches: MatchForSlotCandidates[]
): Map<number, SlotCandidates> {
  const byId = new Map(matches.map((m) => [m.id, m]))
  const cache = new Map<number, string[]>()

  function slotCandidates(match: MatchForSlotCandidates, side: 'home' | 'away'): string[] {
    const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId
    if (teamId) return [teamId]

    const fromMatchId = side === 'home' ? match.homeFromMatchId : match.awayFromMatchId
    const fromPosition = side === 'home' ? match.homeFromPosition : match.awayFromPosition
    if (!fromMatchId) return []

    const fromMatch = byId.get(fromMatchId)
    if (!fromMatch) return []

    if (fromMatch.status === 'finished') {
      const { winnerId, loserId } = getWinnerLoser(fromMatch)
      const resolvedId = fromPosition === 'loser' ? loserId : winnerId
      return resolvedId ? [resolvedId] : []
    }

    return participantCandidates(fromMatch)
  }

  function participantCandidates(match: MatchForSlotCandidates): string[] {
    const cached = cache.get(match.id)
    if (cached) return cached

    // Placeholder while resolving, guards against malformed cyclical fromMatchId data.
    cache.set(match.id, [])
    const result = dedupe([...slotCandidates(match, 'home'), ...slotCandidates(match, 'away')])
    cache.set(match.id, result)
    return result
  }

  const result = new Map<number, SlotCandidates>()
  for (const match of matches) {
    result.set(match.id, {
      home: slotCandidates(match, 'home'),
      away: slotCandidates(match, 'away'),
    })
  }
  return result
}
