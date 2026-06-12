const ARG_OFFSET_HOURS = 3

/** Medianoche del 10/07/2026 hora Argentina. */
export function getPioReunionTargetDate(): Date {
  const [year, month, day] = [2026, 7, 10]
  return new Date(Date.UTC(year, month - 1, day, ARG_OFFSET_HOURS, 0, 0))
}

export const PIO_REUNION_TARGET_ISO = getPioReunionTargetDate().toISOString()

export function isPioProfile(user: { name: string; username?: string | null }): boolean {
  const values = [user.name, user.username]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim().toLowerCase())

  return values.includes('pio')
}
