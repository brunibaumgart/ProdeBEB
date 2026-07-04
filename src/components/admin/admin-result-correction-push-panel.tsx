'use client'

import { Megaphone } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'

import { adminSendPioResultCorrectionPush } from '@/app/actions/announcements'
import { Button } from '@/components/ui/button'

export function AdminResultCorrectionPushPanel() {
  const [isPending, startTransition] = useTransition()

  function handleSendPush() {
    startTransition(async () => {
      const result = await adminSendPioResultCorrectionPush()
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
        Push — Resultado corregido (Canadá 🇨🇦 vs Marruecos 🇲🇦)
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Avisa a pio que ya corregimos su predicción de 2-1 a 1-2 y que ahora suma el punto por
        acertar el ganador.
      </p>
      <div className="mt-4">
        <Button type="button" variant="outline" disabled={isPending} onClick={handleSendPush}>
          <Megaphone data-icon="inline-start" aria-hidden />
          {isPending ? 'Enviando…' : 'Enviar notificación a pio'}
        </Button>
      </div>
    </section>
  )
}
