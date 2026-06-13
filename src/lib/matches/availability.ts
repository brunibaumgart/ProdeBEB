import type { MatchWithRelations } from '@/lib/queries/matches'
import { isDbMatchLocked } from '@/lib/time'

export const PREDICTION_LOCK_MINUTES = 5
/** Cuándo el grupo puede ver las predicciones de otros (antes del kick-off). */
export const PREDICTION_REVEAL_MINUTES = 60

export function isMatchPredictable(
  match: Pick<MatchWithRelations, 'status' | 'round' | 'homeTeamId' | 'awayTeamId'>
): boolean {
  if (match.status !== 'scheduled') return false
  return Boolean(match.homeTeamId && match.awayTeamId)
}

export function canEditPrediction(
  match: Pick<MatchWithRelations, 'date' | 'status'>
): boolean {
  return !isDbMatchLocked(match, PREDICTION_LOCK_MINUTES)
}

export function getMatchSectionKey(match: MatchWithRelations): string {
  if (match.round === 'Group Stage' && match.matchday) {
    return `matchday-${match.matchday}`
  }
  return match.round
}

export function getMatchSectionLabel(match: MatchWithRelations): string {
  if (match.round === 'Group Stage' && match.matchday) {
    return `Fecha ${match.matchday}`
  }

  const labels: Record<string, string> = {
    'Round of 32': 'Ronda de 32',
    'Round of 16': 'Octavos de Final',
    Quarterfinals: 'Cuartos de Final',
    Semifinals: 'Semifinales',
    '3rd Place': 'Tercer Puesto',
    Final: 'Final',
  }

  return labels[match.round] ?? match.round
}

export function groupMatchesBySection(
  matches: MatchWithRelations[]
): Map<string, { label: string; matches: MatchWithRelations[] }> {
  const grouped = new Map<string, { label: string; matches: MatchWithRelations[] }>()

  for (const match of matches) {
    const key = getMatchSectionKey(match)
    const existing = grouped.get(key)
    if (existing) {
      existing.matches.push(match)
    } else {
      grouped.set(key, { label: getMatchSectionLabel(match), matches: [match] })
    }
  }

  return grouped
}
