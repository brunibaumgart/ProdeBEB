'use client'

import { Megaphone } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'

import { adminSendFinalistNoticePush } from '@/app/actions/announcements'
import { Button } from '@/components/ui/button'

export function AdminFinalistPushPanel() {
  const [isPending, startTransition] = useTransition()

  function handleSendPush() {
    startTransition(async () => {
      const result = await adminSendFinalistNoticePush()
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
        Push — Argentina finalista 🇦🇷
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Manda a todos los usuarios con push activo: &quot;SOMOS FINALISTAS DEL MUNDO! 🇦🇷&quot;
        (Argentina 2-1 Inglaterra).
      </p>
      <div className="mt-4">
        <Button type="button" variant="outline" disabled={isPending} onClick={handleSendPush}>
          <Megaphone data-icon="inline-start" aria-hidden />
          {isPending ? 'Enviando…' : 'Enviar notificación a todos'}
        </Button>
      </div>
    </section>
  )
}
