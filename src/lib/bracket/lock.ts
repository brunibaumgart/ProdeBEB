import { matchDateUTC } from '@/lib/time'

/** Duración estimada del último partido de fecha 1 para calcular el cierre. */
const MATCHDAY_1_END_BUFFER_MINUTES = 105

/**
 * Último partido de fecha 1: M24 — 2026-06-17 23:00 ARG.
 * El Prode Completo se puede editar hasta el final de esa fecha.
 */
const LAST_MATCHDAY_1 = { date: '2026-06-17', time_arg: '23:00' } as const

export const BRACKET_LOCK_DATE = new Date(
  matchDateUTC(LAST_MATCHDAY_1.date, LAST_MATCHDAY_1.time_arg).getTime() +
    MATCHDAY_1_END_BUFFER_MINUTES * 60_000
)

export const BRACKET_LOCK_LABEL = '17 jun 2026, 23:00 ARG (fin de la fecha 1)'

export function isBracketGloballyLocked(): boolean {
  return new Date() >= BRACKET_LOCK_DATE
}

export function canEditBracketEntry(entry: { locked: boolean } | null | undefined): boolean {
  if (isBracketGloballyLocked()) return false
  if (entry?.locked) return false
  return true
}
