'use client'

import { Heart, Loader2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { sendOsitoSurpriseMessage } from '@/app/actions/push'
import { Button } from '@/components/ui/button'

export function ParaOsitoPanel() {
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    startTransition(async () => {
      const result = await sendOsitoSurpriseMessage(message)
      if (result.ok) {
        toast.success(result.message)
        setMessage('')
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="rounded-xl border border-brand-gold/30 bg-gradient-to-br from-brand-gold/10 via-card to-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-gold/20 text-brand-gold">
          <Heart className="size-5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-lg tracking-wide text-brand-gold">PARA OSITO</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Escribí un mensajito y le llega a osito y a vos como notificación sorpresa.
          </p>

          <label htmlFor="osito-message" className="sr-only">
            Mensaje para osito
          </label>
          <textarea
            id="osito-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={isPending}
            maxLength={240}
            rows={3}
            placeholder="Ej: Te extraño, nos vemos después del partido…"
            className="mt-4 w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/40 disabled:opacity-50"
          />

          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{message.length}/240</span>
            <Button
              type="button"
              size="sm"
              onClick={handleSend}
              disabled={isPending || message.trim().length === 0}
              className="bg-brand-gold text-background hover:bg-brand-gold/90"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Enviando…
                </>
              ) : (
                'Enviar sorpresa'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
