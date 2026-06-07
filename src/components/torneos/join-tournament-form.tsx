'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn } from 'lucide-react'

import { joinTournament } from '@/app/actions/tournaments'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TournamentQuotaStatus } from '@/lib/tournament/quota-logic'
import { PAID_JOIN_PRICE_ARS } from '@/lib/tournament/quota-logic'

export function JoinTournamentForm({ quota }: { quota: TournamentQuotaStatus }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const paidJoin = !quota.isUnlimited && quota.requiresPaymentToJoin

  function reset() {
    setCode('')
    setError(null)
  }

  function handleSubmit() {
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
      reset()
      setOpen(false)
      if (result.tournamentId) {
        router.push(`/torneos/${result.tournamentId}`)
        return
      }
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        if (!value) reset()
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline">
            <LogIn className="size-4" aria-hidden />
            {paidJoin ? `Unirme ($${PAID_JOIN_PRICE_ARS})` : 'Unirme con código'}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unirme a un torneo</DialogTitle>
          <DialogDescription>
            {quota.isUnlimited
              ? 'Ingresá el código de 6 caracteres que te compartieron.'
              : paidJoin
                ? `Sin cupos gratis. Pagá $${PAID_JOIN_PRICE_ARS} ARS con Mercado Pago para unirte.`
                : `Te quedan ${quota.joinsRemaining} unión${quota.joinsRemaining === 1 ? '' : 'es'} gratis.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5">
          <Label htmlFor="tournament-code">Código</Label>
          <Input
            id="tournament-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="ARGXYZ"
            maxLength={6}
            className="uppercase tracking-[0.3em]"
            disabled={isPending}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending || code.trim().length !== 6}>
            {isPending
              ? paidJoin
                ? 'Redirigiendo…'
                : 'Uniéndome…'
              : paidJoin
                ? `Pagar $${PAID_JOIN_PRICE_ARS} y unirme`
                : 'Unirme'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
