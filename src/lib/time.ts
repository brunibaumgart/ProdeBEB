import type { FixtureMatch } from '@/lib/data'

const ARG_OFFSET_HOURS = 3
const ARG_TIMEZONE = 'America/Argentina/Buenos_Aires'
const TWO_HOURS_MS = 2 * 60 * 60 * 1000

export function matchDateUTC(dateStr: string, timeArg: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeArg.split(':').map(Number)
  return new Date(Date.UTC(year, month - 1, day, hours + ARG_OFFSET_HOURS, minutes))
}

export function getArgentinaTodayBounds(): { gte: Date; lte: Date } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARG_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = Number(parts.find((part) => part.type === 'year')!.value)
  const month = Number(parts.find((part) => part.type === 'month')!.value)
  const day = Number(parts.find((part) => part.type === 'day')!.value)

  return {
    gte: new Date(Date.UTC(year, month - 1, day, 3, 0, 0)),
    lte: new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59, 999)),
  }
}

export function getArgentinaTodayDateStr(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARG_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = Number(parts.find((part) => part.type === 'year')!.value)
  const month = Number(parts.find((part) => part.type === 'month')!.value)
  const day = Number(parts.find((part) => part.type === 'day')!.value)

  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10)
}

export function getArgentinaTomorrowBounds(): { gte: Date; lte: Date; dateStr: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARG_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = Number(parts.find((part) => part.type === 'year')!.value)
  const month = Number(parts.find((part) => part.type === 'month')!.value)
  const day = Number(parts.find((part) => part.type === 'day')!.value)

  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1))
  const dateStr = tomorrow.toISOString().slice(0, 10)

  return {
    dateStr,
    gte: new Date(Date.UTC(year, month - 1, day + 1, 3, 0, 0)),
    lte: new Date(Date.UTC(year, month - 1, day + 2, 2, 59, 59, 999)),
  }
}

export function toArgentinaTime(date: Date): string {
  return date.toLocaleString('es-AR', {
    timeZone: ARG_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatArgentinaDate(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    timeZone: ARG_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function formatDayHeader(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    timeZone: ARG_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function formatUtcTime(date: Date): string {
  return `${date.toISOString().slice(11, 16)} UTC`
}

export function formatMatchKickoff(match: Pick<FixtureMatch, 'date' | 'time_arg'>): string {
  const kickoff = matchDateUTC(match.date, match.time_arg)
  return `${formatArgentinaDate(kickoff)} · ${match.time_arg} ARG`
}

export function formatDbMatchKickoff(date: Date, timeArg: string): string {
  return `${formatArgentinaDate(date)} · ${timeArg} ARG`
}

export function isWithinTwoHours(date: Date): boolean {
  const diff = date.getTime() - Date.now()
  return diff > 0 && diff <= TWO_HOURS_MS
}

export function isMatchLocked(
  match: Pick<FixtureMatch, 'date' | 'time_arg' | 'status'>,
  offsetMinutes = 0
): boolean {
  if (match.status === 'finished' || match.status === 'live') return true
  const kickoff = matchDateUTC(match.date, match.time_arg)
  const lockTime = kickoff.getTime() - offsetMinutes * 60_000
  return Date.now() >= lockTime
}

export function isDbMatchLocked(
  match: { date: Date; status: string },
  offsetMinutes = 0
): boolean {
  if (match.status === 'finished' || match.status === 'live') return true
  const lockTime = match.date.getTime() - offsetMinutes * 60_000
  return Date.now() >= lockTime
}

export function getTimeUntilKickoff(match: Pick<FixtureMatch, 'date' | 'time_arg'>): number {
  const kickoff = matchDateUTC(match.date, match.time_arg)
  return Math.max(0, kickoff.getTime() - Date.now())
}

export function getTimeUntilDate(date: Date): number {
  return Math.max(0, date.getTime() - Date.now())
}
