const ARG_OFFSET_HOURS = 3

/** Medianoche del 10/07/2026 hora Argentina. */
export function getPioReunionTargetDate(): Date {
  const [year, month, day] = [2026, 7, 10]
  return new Date(Date.UTC(year, month - 1, day, ARG_OFFSET_HOURS, 0, 0))
}

export const PIO_REUNION_TARGET_ISO = getPioReunionTargetDate().toISOString()

/** Solo el usuario de Prode con nombre exacto "pio" (no el nombre de Clerk). */
export function isPioProfile(user: { name?: string | null } | string | null | undefined): boolean {
  const name = typeof user === 'string' ? user : user?.name
  return name?.trim().toLowerCase() === 'pio'
}
