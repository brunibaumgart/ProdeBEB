export const GLOBAL_TOURNAMENT_CODE = 'GLOBAL'
export const FREE_TOURNAMENT_CREATE_LIMIT = 2
export const FREE_TOURNAMENT_JOIN_LIMIT = 3
export const PAID_CREATE_PRICE_ARS = 500
export const PAID_JOIN_PRICE_ARS = 100

export type TournamentQuotaStatus = {
  isUnlimited: boolean
  createsUsed: number
  createsLimit: number
  createsRemaining: number
  joinsUsed: number
  joinsLimit: number
  joinsRemaining: number
  canCreateFree: boolean
  canJoinFree: boolean
  requiresPaymentToCreate: boolean
  requiresPaymentToJoin: boolean
}

export function buildTournamentQuotaStatus(
  createsUsed: number,
  joinsUsed: number,
  isUnlimited: boolean,
): TournamentQuotaStatus {
  if (isUnlimited) {
    return {
      isUnlimited: true,
      createsUsed,
      createsLimit: FREE_TOURNAMENT_CREATE_LIMIT,
      createsRemaining: FREE_TOURNAMENT_CREATE_LIMIT,
      joinsUsed,
      joinsLimit: FREE_TOURNAMENT_JOIN_LIMIT,
      joinsRemaining: FREE_TOURNAMENT_JOIN_LIMIT,
      canCreateFree: true,
      canJoinFree: true,
      requiresPaymentToCreate: false,
      requiresPaymentToJoin: false,
    }
  }

  const createsRemaining = Math.max(0, FREE_TOURNAMENT_CREATE_LIMIT - createsUsed)
  const joinsRemaining = Math.max(0, FREE_TOURNAMENT_JOIN_LIMIT - joinsUsed)

  return {
    isUnlimited: false,
    createsUsed,
    createsLimit: FREE_TOURNAMENT_CREATE_LIMIT,
    createsRemaining,
    joinsUsed,
    joinsLimit: FREE_TOURNAMENT_JOIN_LIMIT,
    joinsRemaining,
    canCreateFree: createsRemaining > 0,
    canJoinFree: joinsRemaining > 0,
    requiresPaymentToCreate: createsRemaining === 0,
    requiresPaymentToJoin: joinsRemaining === 0,
  }
}

export function quotaCreateBlockedMessage(): string {
  return `Ya usaste tus ${FREE_TOURNAMENT_CREATE_LIMIT} torneos gratis para crear. Podés crear uno por $${PAID_CREATE_PRICE_ARS} ARS con Mercado Pago.`
}

export function quotaJoinBlockedMessage(): string {
  return `Ya usaste tus ${FREE_TOURNAMENT_JOIN_LIMIT} cupos gratis para unirte a torneos. Podés unirte por $${PAID_JOIN_PRICE_ARS} ARS con Mercado Pago.`
}
