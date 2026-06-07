'use client'

import { Shield } from 'lucide-react'

import type { TournamentQuotaStatus } from '@/lib/tournament/quota-logic'
import {
  FREE_TOURNAMENT_CREATE_LIMIT,
  FREE_TOURNAMENT_JOIN_LIMIT,
  PAID_CREATE_PRICE_ARS,
  PAID_JOIN_PRICE_ARS,
} from '@/lib/tournament/quota-logic'

type Props = {
  quota: TournamentQuotaStatus
}

export function TournamentQuotaBanner({ quota }: Props) {
  if (quota.isUnlimited) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-800 dark:text-orange-200">
        <Shield className="size-4 shrink-0" aria-hidden />
        <span>Admin · creación y unión a torneos privados ilimitada.</span>
      </div>
    )
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-card px-4 py-3 text-sm">
      <p className="font-medium">Cupos gratis de torneos privados</p>
      <p className="mt-1 text-muted-foreground">
        Crear:{' '}
        <span className="font-medium text-foreground">
          {quota.createsRemaining}/{FREE_TOURNAMENT_CREATE_LIMIT}
        </span>{' '}
        restantes
        {' · '}
        Unirse:{' '}
        <span className="font-medium text-foreground">
          {quota.joinsRemaining}/{FREE_TOURNAMENT_JOIN_LIMIT}
        </span>{' '}
        restantes
      </p>
      {(quota.requiresPaymentToCreate || quota.requiresPaymentToJoin) && (
        <p className="mt-2 text-xs text-muted-foreground">
          {quota.requiresPaymentToCreate && (
            <>Creación extra: ${PAID_CREATE_PRICE_ARS} ARS con Mercado Pago. </>
          )}
          {quota.requiresPaymentToJoin && (
            <>Unión extra: ${PAID_JOIN_PRICE_ARS} ARS con Mercado Pago.</>
          )}
        </p>
      )}
    </div>
  )
}
