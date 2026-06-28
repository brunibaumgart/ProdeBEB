'use client'

import { Megaphone } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'

import { adminSendPenaltiesWinnerNoticePush } from '@/app/actions/announcements'
import { Button } from '@/components/ui/button'

export function AdminPenaltiesWinnerPushPanel() {
  const [isPending, startTransition] = useTransition()

  function handleSendPush() {
    startTransition(async () => {
      const result = await adminSendPenaltiesWinnerNoticePush()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message)
    })
  }

  return (
    <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <h2 className="font-heading text-lg tracking-wide text-foreground">
        Push — Ganador por penales
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Avisa a todos los usuarios con <strong>Recordatorio 11:00</strong> activo que ahora
        pueden elegir quién pasa por penales (+2 pts). Pio y Bruno reciben un mensaje especial 🐤.
      </p>
      <div className="mt-4">
        <Button type="button" variant="outline" disabled={isPending} onClick={handleSendPush}>
          <Megaphone data-icon="inline-start" aria-hidden />
          {isPending ? 'Enviando…' : 'Enviar notificación'}
        </Button>
      </div>
    </section>
  )
}
