import { formatDbMatchKickoff } from '@/lib/time'

export function canRevealTournamentMemberPredictions(match: { date: Date }): boolean {
  return Date.now() >= match.date.getTime()
}

export function getTournamentPredictionRevealMessage(date: Date, timeArg: string): string {
  return `Las predicciones se revelan al inicio del partido (${formatDbMatchKickoff(date, timeArg)}).`
}

export function isPrivateTournament(tournament: { code: string; isPublic: boolean }): boolean {
  return tournament.code !== 'GLOBAL' && !tournament.isPublic
}
