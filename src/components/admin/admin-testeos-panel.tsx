'use client'

import { Bell, Timer } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { sendAdminTestPushNotification } from '@/app/actions/push'
import { Button } from '@/components/ui/button'

const DELAY_SECONDS = 30

interface AdminTesteosPanelProps {
  pushRemindersEnabled: boolean
  pushSubscriptionCount: number
}

export function AdminTesteosPanel({
  pushRemindersEnabled,
  pushSubscriptionCount,
}: AdminTesteosPanelProps) {
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isSending, setIsSending] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isScheduled = countdown != null
  const canSchedule = pushSubscriptionCount > 0 && !isScheduled && !isSending

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  function clearTimers() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    timeoutRef.current = null
    intervalRef.current = null
  }

  function cancelScheduled() {
    clearTimers()
    setCountdown(null)
    toast.info('Envío cancelado.')
  }

  async function fireTestPush() {
    setIsSending(true)
    const result = await sendAdminTestPushNotification()
    setIsSending(false)

    if (result.ok) toast.success(result.message)
    else toast.error(result.error)
  }

  function scheduleTestPush() {
    if (!canSchedule) return

    setCountdown(DELAY_SECONDS)
    toast.success(`Notificación programada en ${DELAY_SECONDS} segundos.`)

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev == null || prev <= 1) return prev
        return prev - 1
      })
    }, 1000)

    timeoutRef.current = setTimeout(() => {
      clearTimers()
      setCountdown(null)
      void fireTestPush()
    }, DELAY_SECONDS * 1000)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bell className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-xl tracking-wide">NOTIFICACIONES PUSH</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Configurá qué avisos querés en perfil. Las sorpresas van a quien las tenga activadas
              (pio y cuentas habilitadas).
            </p>

            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <dt className="text-muted-foreground">Recordatorio 11:00</dt>
                <dd className="font-medium">{pushRemindersEnabled ? 'Activo' : 'Inactivo'}</dd>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <dt className="text-muted-foreground">Dispositivos suscriptos</dt>
                <dd className="font-medium tabular-nums">{pushSubscriptionCount}</dd>
              </div>
            </dl>

            {pushSubscriptionCount === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Activá notificaciones en{' '}
                <Link href="/perfil#notificaciones" className="font-medium text-primary hover:underline">
                  tu perfil
                </Link>{' '}
                desde el celular para recibir kick-off y probar envíos.
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {isScheduled ? (
                <>
                  <Button type="button" variant="outline" onClick={cancelScheduled}>
                    Cancelar ({countdown}s)
                  </Button>
                  <span className="inline-flex items-center gap-1.5 text-sm text-brand-gold">
                    <Timer className="size-4" aria-hidden />
                    Enviando en {countdown}s…
                  </span>
                </>
              ) : (
                <Button type="button" onClick={scheduleTestPush} disabled={!canSchedule}>
                  {isSending ? 'Enviando…' : `Probar push (${DELAY_SECONDS}s)`}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
