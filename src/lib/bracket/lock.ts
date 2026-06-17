import { matchDateUTC } from '@/lib/time'

/**
 * El Prode Completo se puede editar hasta el 22 de junio de 2026 (fin del día, hora ARG).
 */
const BRACKET_LOCK_DAY = { date: '2026-06-22', time_arg: '23:59' } as const

export const BRACKET_LOCK_DATE = matchDateUTC(BRACKET_LOCK_DAY.date, BRACKET_LOCK_DAY.time_arg)

export const BRACKET_LOCK_LABEL = '22 jun 2026'

export function isBracketGloballyLocked(): boolean {
  return new Date() >= BRACKET_LOCK_DATE
}

export function canEditBracketEntry(_entry: { locked: boolean } | null | undefined): boolean {
  return !isBracketGloballyLocked()
}
