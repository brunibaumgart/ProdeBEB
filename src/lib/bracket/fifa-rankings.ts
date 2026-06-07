import fifaRankingsData from '../../../data/fifa_rankings.json'

export interface TeamTiebreakMeta {
  /** Mayor = mejor (menos tarjetas). Por defecto 0 si no hay datos. */
  fairPlayScore: number
  /** Posición FIFA (1 = mejor). */
  fifaRanking: number
}

const DEFAULT_RANKING = 9999

const rankingsMap = new Map<string, number>(
  Object.entries(fifaRankingsData.rankings as Record<string, number>)
)

export function getFifaRanking(teamName: string): number {
  return rankingsMap.get(teamName) ?? DEFAULT_RANKING
}

export function buildTiebreakMeta(
  teamNames: string[],
  fairPlayByTeam?: Record<string, number>
): Map<string, TeamTiebreakMeta> {
  const meta = new Map<string, TeamTiebreakMeta>()
  for (const name of teamNames) {
    meta.set(name, {
      fairPlayScore: fairPlayByTeam?.[name] ?? 0,
      fifaRanking: getFifaRanking(name),
    })
  }
  return meta
}

export const FIFA_RANKINGS_UPDATED = fifaRankingsData.updated
