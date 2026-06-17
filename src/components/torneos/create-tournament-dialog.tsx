'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

import { createTournament } from '@/app/actions/tournaments'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { ModeInfoPopover } from '@/components/torneos/mode-info-popover'
import type { TournamentQuotaStatus } from '@/lib/tournament/quota-logic'
import { PAID_CREATE_PRICE_ARS } from '@/lib/tournament/quota-logic'

const MODE_OPTIONS = [
  {
    key: 'matchday' as const,
    label: 'Fecha a Fecha',
    description: 'Predecí el resultado de cada partido antes de cada kick-off.',
    scoring: [
      'Resultado exacto: 3 puntos.',
      'Acertás ganador o empate (sin el resultado exacto): 1 punto.',
      'Si además acertás la diferencia de goles: +1 punto extra.',
      'Misma regla en los 104 partidos, sin multiplicadores por ronda.',
    ],
  },
  {
    key: 'complete' as const,
    label: 'Prode Completo',
    description: 'Predecí de antemano todo el bracket: grupos, cruces y campeón.',
    scoring: [
      '1 punto por cada equipo que acertás entre los 32 de dieciseisavos.',
      '+2 extra si acertás la posición exacta en el grupo.',
      'Eliminatorias: puntos por equipo en la ronda y bonus por cruce exacto (más en instancias finales).',
      'Campeón: 50 puntos. Tercero: 30 puntos.',
    ],
  },
  {
    key: 'scorers' as const,
    label: 'Goleadores',
    description: 'Sumá a tus predicciones de Fecha a Fecha quién creés que va a convertir.',
    scoring: [
      'Sumás por cada goleador que acertaste, sin importar el orden en que lo predijiste.',
      'Arquero: +10 · Defensor: +5 · Mediocampista: +2 · Delantero: +1.',
      'Solo cuenta si ese jugador convirtió en el partido real.',
      'Es independiente del resultado: podés errar el marcador y aun así sumar por goleadores.',
    ],
  },
]

export function CreateTournamentDialog({ quota }: { quota: TournamentQuotaStatus }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [modes, setModes] = useState({ matchday: true, complete: true, scorers: true })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const paidCreate = !quota.isUnlimited && quota.requiresPaymentToCreate

  function reset() {
    setName('')
    setDescription('')
    setModes({ matchday: true, complete: true, scorers: true })
    setError(null)
  }

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await createTournament(name, description || null, modes)
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
          <Button>
            <Plus className="size-4" aria-hidden />
            {paidCreate ? `Crear ($${PAID_CREATE_PRICE_ARS})` : 'Crear torneo'}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear torneo privado</DialogTitle>
          <DialogDescription>
            {quota.isUnlimited
              ? 'Invitá a tus amigos con un código de 6 caracteres.'
              : paidCreate
                ? `Sin cupos gratis. Pagá $${PAID_CREATE_PRICE_ARS} ARS con Mercado Pago para crear este torneo.`
                : `Te quedan ${quota.createsRemaining} creación${quota.createsRemaining === 1 ? '' : 'es'} gratis.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="tournament-name">Nombre</Label>
            <Input
              id="tournament-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Los pibes del prode"
              maxLength={60}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="tournament-description">Descripción (opcional)</Label>
            <Input
              id="tournament-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="El que pierde paga el asado"
              maxLength={140}
              disabled={isPending}
            />
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Modos activos</legend>
            <p className="-mt-1 text-xs text-muted-foreground">
              Elegí qué modos suman puntos en este torneo. La tabla de posiciones general combina
              los puntos de todos los modos que actives, y vas a poder filtrarla por cada uno.
            </p>
            {MODE_OPTIONS.map(({ key, label, description, scoring }) => (
              <div key={key} className="flex items-start gap-2.5 rounded-lg border border-border/60 p-2.5">
                <Checkbox
                  id={`tournament-mode-${key}`}
                  checked={modes[key]}
                  onCheckedChange={(checked) =>
                    setModes((current) => ({ ...current, [key]: checked === true }))
                  }
                  disabled={isPending}
                  className="mt-0.5"
                />
                <Label htmlFor={`tournament-mode-${key}`} className="flex-1 cursor-pointer flex-col items-start gap-0.5">
                  <span className="flex items-center gap-1.5">
                    {label}
                    <ModeInfoPopover title={label} scoring={scoring} />
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">{description}</span>
                </Label>
              </div>
            ))}
          </fieldset>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending
              ? paidCreate
                ? 'Redirigiendo…'
                : 'Creando…'
              : paidCreate
                ? `Pagar $${PAID_CREATE_PRICE_ARS} y crear`
                : 'Crear torneo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
