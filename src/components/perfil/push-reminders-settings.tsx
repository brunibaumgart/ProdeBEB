'use client'

import { Bell, Smartphone } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { setPushRemindersEnabled } from '@/app/actions/push'
import { cn } from '@/lib/utils'
import {
  getNotificationPermission,
  isPushSupported,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '@/lib/push/client'

interface PushRemindersSettingsProps {
  pushRemindersEnabled: boolean
  pushSubscriptionCount: number
  adminOnlyMode?: boolean
}

export function PushRemindersSettings({
  pushRemindersEnabled: initialEnabled,
  pushSubscriptionCount,
  adminOnlyMode = false,
}: PushRemindersSettingsProps) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()

  const supported = isPushSupported()
  const permission = supported ? getNotificationPermission() : 'unsupported'

  function handleToggle() {
    if (!supported) return

    startTransition(async () => {
      if (enabled) {
        try {
          await unsubscribeFromPushNotifications()
          const result = await setPushRemindersEnabled(false)
          if (!result.ok) {
            toast.error(result.error)
            return
          }
          setEnabled(false)
          toast.success(result.message)
          router.refresh()
        } catch {
          toast.error('No se pudo desactivar el recordatorio.')
        }
        return
      }

      try {
        await subscribeToPushNotifications()
        setEnabled(true)
        toast.success('Recordatorio activado. Te avisamos a las 11:00 si hay partidos hoy.')
        router.refresh()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'No se pudo activar el recordatorio.'
        toast.error(message)
      }
    })
  }

  return (
    <div id="notificaciones" className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bell className="size-5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-medium text-foreground">Recordatorio diario de partidos</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                A las 11:00 (hora Argentina) te avisamos si hay partidos hoy y cuántas predicciones
                te faltan.
              </p>
            </div>

            {supported ? (
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label="Recordatorio diario de partidos"
                disabled={isPending}
                onClick={handleToggle}
                className={cn(
                  'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
                  enabled ? 'bg-primary' : 'bg-muted',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none block size-6 rounded-full bg-background shadow-sm transition-transform',
                    enabled ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </button>
            ) : null}
          </div>

          {!supported ? (
            <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
              <Smartphone className="mt-0.5 size-4 shrink-0" aria-hidden />
              Las notificaciones funcionan en el celular si agregás ProdeBEB a la pantalla de inicio
              (Chrome o Safari) y activás el permiso desde acá.
            </p>
          ) : null}

          {supported && permission === 'denied' ? (
            <p className="mt-3 text-sm text-destructive">
              Bloqueaste las notificaciones en el navegador. Habilitalas en la configuración del
              sitio para recibir recordatorios.
            </p>
          ) : null}

          {adminOnlyMode ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Modo prueba: solo admins pueden activar y recibir recordatorios por ahora.
            </p>
          ) : null}

          {enabled && pushSubscriptionCount > 0 ? (
            <p className="mt-3 text-xs text-brand-gold">
              Activo en {pushSubscriptionCount === 1 ? 'este dispositivo' : `${pushSubscriptionCount} dispositivos`}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
