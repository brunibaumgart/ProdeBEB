import type { MatchWithRelations } from '@/lib/queries/matches'

function teamFlag(team: { flagEmoji: string } | null | undefined, fallback = '⚽'): string {
  const flag = team?.flagEmoji?.trim()
  return flag || fallback
}

/** Línea compacta con banderas: 🇨🇦 vs 🇧🇦 */
export function formatMatchFlagsVs(
  match: Pick<MatchWithRelations, 'homeTeam' | 'awayTeam'>,
): string {
  return `${teamFlag(match.homeTeam)} vs ${teamFlag(match.awayTeam)}`
}

/** Línea con banderas y horario: 🇨🇦 vs 🇧🇦 · 16:00 */
export function formatMatchFlagsLine(
  match: Pick<MatchWithRelations, 'homeTeam' | 'awayTeam' | 'timeArg'>,
): string {
  const flags = formatMatchFlagsVs(match)
  const timeArg = match.timeArg?.trim()
  return timeArg ? `${flags} · ${timeArg}` : flags
}

export function buildKickoffNotificationCopy(match: MatchWithRelations): {
  title: string
  body: string
} {
  const timeArg = match.timeArg?.trim()
  return {
    title: formatMatchFlagsVs(match),
    body: timeArg ? `Arrancó el partido · ${timeArg} ARG` : 'Arrancó el partido',
  }
}

export function buildGoalNotificationCopy(
  match: Pick<MatchWithRelations, 'homeTeam' | 'awayTeam'>,
  event: { isHome: boolean; scorerLabel: string },
  homeScore: number,
  awayScore: number,
): { title: string; body: string } {
  const scoringTeam = event.isHome ? match.homeTeam : match.awayTeam
  const flag = teamFlag(scoringTeam)

  return {
    title: `${flag} ${event.scorerLabel}`,
    body: `${formatMatchFlagsVs(match)} · ${homeScore}-${awayScore}`,
  }
}
