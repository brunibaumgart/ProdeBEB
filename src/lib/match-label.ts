interface MatchLabelTeam {
  nameEs: string
}

interface MatchLabelInput {
  homeTeam: MatchLabelTeam | null
  awayTeam: MatchLabelTeam | null
  homeLabel: string | null
  awayLabel: string | null
}

export function getMatchTitle(match: MatchLabelInput): string {
  const home = match.homeTeam?.nameEs ?? match.homeLabel ?? 'Local'
  const away = match.awayTeam?.nameEs ?? match.awayLabel ?? 'Visitante'
  return `${home} vs ${away}`
}
