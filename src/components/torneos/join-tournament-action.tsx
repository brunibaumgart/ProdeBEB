'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { joinTournament } from '@/app/actions/tournaments'
import { Button } from '@/components/ui/button'
import type { TournamentQuotaStatus } from '@/lib/tournament/quota-logic'
import { PAID_JOIN_PRICE_ARS } from '@/lib/tournament/quota-logic'

interface JoinTournamentActionProps {
  code: string
  quota: TournamentQuotaStatus
}

export function JoinTournamentAction({ code, quota }: JoinTournamentActionProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const paidJoin = !quota.isUnlimited && quota.requiresPaymentToJoin

  function handleJoin() {
    setError(null)
    startTransition(async () => {
      const result = await joinTournament(code)
      if (!result.ok) {
        setError(result.error)
        return
      }

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
        return
      }

      if (result.tournamentId) {
        router.push(`/torneos/${result.tournamentId}`)
        return
      }

      router.push('/torneos')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-stretch gap-3">
      <Button onClick={handleJoin} disabled={isPending} size="lg">
        {isPending
          ? paidJoin
            ? 'Redirigiendo…'
            : 'Uniéndome…'
          : paidJoin
            ? `Pagar $${PAID_JOIN_PRICE_ARS} y unirme`
            : 'Unirme al torneo'}
      </Button>

      {!quota.isUnlimited && !paidJoin && quota.joinsRemaining > 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          Te quedan {quota.joinsRemaining} unión{quota.joinsRemaining === 1 ? '' : 'es'} gratis.
        </p>
      ) : null}

      {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
