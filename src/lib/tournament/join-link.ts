import { TOURNAMENT_CODE_LENGTH } from '@/lib/tournament/internal'

export function normalizeTournamentJoinCode(code: string): string {
  return code.trim().toUpperCase()
}

export function isValidTournamentJoinCode(code: string): boolean {
  return normalizeTournamentJoinCode(code).length === TOURNAMENT_CODE_LENGTH
}

export function getTournamentJoinPath(code: string): string {
  return `/torneos/unirse/${normalizeTournamentJoinCode(code)}`
}

export function getTournamentJoinUrl(code: string, origin = process.env.NEXT_PUBLIC_APP_URL): string {
  const base = origin?.replace(/\/$/, '') ?? 'http://localhost:3000'
  return `${base}${getTournamentJoinPath(code)}`
}
