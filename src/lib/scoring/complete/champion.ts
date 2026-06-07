import { COMPLETE_POINTS_CHAMPION } from '@/lib/points'

export function calculateChampionPoints(
  championId: string | null | undefined,
  winnerTeamId: string | null
): number {
  if (!championId || !winnerTeamId) return 0
  return championId === winnerTeamId ? COMPLETE_POINTS_CHAMPION : 0
}
