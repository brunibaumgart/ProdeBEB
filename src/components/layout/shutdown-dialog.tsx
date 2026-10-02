'use client'

import { useState, useSyncExternalStore, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'

import { recordShutdownDialogClosed, sendShutdownMessage } from '@/app/actions/visitor-notes'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const SESSION_FLAG = 'shutdown-dialog-seen'
const MAX_MESSAGE_LENGTH = 1000

function readSeenFlag(): boolean {
  try {
    return sessionStorage.getItem(SESSION_FLAG) === '1'
  } catch {
    // sessionStorage no disponible: lo mostramos igual.
    return false
  }
}

function subscribeNoop() {
  return () => {}
}

export function ShutdownDialog() {
  const pathname = usePathname()
  // En el server lo damos por visto para que solo aparezca en el cliente.
  const seenThisSession = useSyncExternalStore(subscribeNoop, readSeenFlag, () => true)
  const [dismissed, setDismissed] = useState(false)
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  // El admin sigue usando el panel sin el pop-up encima.
  const open = !pathname.startsWith('/admin') && !seenThisSession && !dismissed

  function dismiss() {
    setDismissed(true)
    try {
      sessionStorage.setItem(SESSION_FLAG, '1')
    } catch {
      // Sin sessionStorage vuelve a aparecer en la próxima carga.
    }
  }

  function handleOpenChange(next: boolean) {
    if (next) return
    dismiss()
    void recordShutdownDialogClosed().catch(() => {
      // Silencioso: el registro no debe afectar la experiencia.
    })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const result = await sendShutdownMessage({ message })
      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success(result.message)
      setMessage('')
      dismiss()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>ProdeBEB ya no está en uso</DialogTitle>
            <DialogDescription>Pero contanos, ¿qué necesitás?</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <textarea
              aria-label="Tu mensaje"
              rows={4}
              placeholder="Escribí tu mensaje…"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={isPending}
              maxLength={MAX_MESSAGE_LENGTH}
              required
              className={cn(
                'w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none',
                'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',
              )}
            />
            <p className="text-xs text-muted-foreground">
              🐥 Lo que escribas acá le llega como notificación al administrador.
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || message.trim().length === 0}>
              {isPending ? 'Enviando…' : 'Enviar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
