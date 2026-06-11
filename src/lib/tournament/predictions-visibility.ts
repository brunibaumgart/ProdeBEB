import { PREDICTION_LOCK_MINUTES } from '@/lib/matches/availability'
import { formatDbMatchKickoff, isDbMatchLocked, toArgentinaTime } from '@/lib/time'

export function canRevealTournamentMemberPredictions(
  match: { date: Date; status: string },
): boolean {
  return isDbMatchLocked(match, PREDICTION_LOCK_MINUTES)
}

export function getTournamentPredictionRevealAt(date: Date): Date {
  return new Date(date.getTime() - PREDICTION_LOCK_MINUTES * 60_000)
}

export function getTournamentPredictionRevealMessage(date: Date, timeArg: string): string {
  const revealAt = getTournamentPredictionRevealAt(date)
  return `Las predicciones se revelan ${PREDICTION_LOCK_MINUTES} min antes del kick-off (${formatDbMatchKickoff(revealAt, toArgentinaTime(revealAt))}).`
}

export function getTournamentPredictionRevealSummary(): string {
  return `Las predicciones del grupo se revelan cuando cierra la carga (${PREDICTION_LOCK_MINUTES} min antes del kick-off), igual que en Fecha a Fecha.`
}

export function isPrivateTournament(tournament: { code: string; isPublic: boolean }): boolean {
  return tournament.code !== 'GLOBAL' && !tournament.isPublic
}
