export type GroupMatchOutcome = 'home_win' | 'draw' | 'away_win'

export function outcomeToScores(outcome: GroupMatchOutcome): { predHome: number; predAway: number } {
  switch (outcome) {
    case 'home_win':
      return { predHome: 1, predAway: 0 }
    case 'draw':
      return { predHome: 0, predAway: 0 }
    case 'away_win':
      return { predHome: 0, predAway: 1 }
  }
}

export function scoresToGroupOutcome(
  predHome: number,
  predAway: number,
): GroupMatchOutcome | null {
  if (predHome > predAway) return 'home_win'
  if (predHome < predAway) return 'away_win'
  if (predHome === predAway) return 'draw'
  return null
}

export function matchdayScoresToGroupOutcome(
  predHome: number,
  predAway: number,
): GroupMatchOutcome {
  return scoresToGroupOutcome(predHome, predAway) ?? 'draw'
}

export function formatGroupOutcomeLabel(
  outcome: GroupMatchOutcome,
  homeName: string,
  awayName: string,
): string {
  switch (outcome) {
    case 'home_win':
      return `Victoria ${homeName}`
    case 'draw':
      return 'Empate'
    case 'away_win':
      return `Victoria ${awayName}`
  }
}

/** Marcador genérico 1-0 / 0-0 / 0-1 usado al votar por bandera o centro. */
export function isCanonicalGroupOutcomeScore(predHome: number, predAway: number): boolean {
  return (
    (predHome === 1 && predAway === 0) ||
    (predHome === 0 && predAway === 0) ||
    (predHome === 0 && predAway === 1)
  )
}

export function formatGroupPredictionLabel(
  predHome: number,
  predAway: number,
  homeName: string,
  awayName: string,
): { title: string; subtitle?: string } {
  const outcome = scoresToGroupOutcome(predHome, predAway)
  if (outcome && isCanonicalGroupOutcomeScore(predHome, predAway)) {
    return { title: formatGroupOutcomeLabel(outcome, homeName, awayName) }
  }

  const outcomeTitle =
    outcome != null ? formatGroupOutcomeLabel(outcome, homeName, awayName) : 'Marcador'
  return {
    title: `${predHome} – ${predAway}`,
    subtitle: outcomeTitle,
  }
}

export function encodeKnockoutWinner(
  advancesTeamId: string,
  homeTeamId: string,
): { predHome: number; predAway: number } {
  return advancesTeamId === homeTeamId
    ? { predHome: 1, predAway: 0 }
    : { predHome: 0, predAway: 1 }
}

export function decodeKnockoutWinnerTeamId(
  predHome: number,
  predAway: number,
  homeTeamId: string,
  awayTeamId: string,
  predAdvancesTeamId?: string | null,
): string | null {
  if (predAdvancesTeamId) return predAdvancesTeamId
  if (predHome > predAway) return homeTeamId
  if (predAway > predHome) return awayTeamId
  return null
}
