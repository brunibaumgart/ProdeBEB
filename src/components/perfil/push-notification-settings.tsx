'use client'

import { Bell, Smartphone } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { updatePushPreferences } from '@/app/actions/push'
import {
  PushPreferenceFields,
  type PushPreferenceValues,
} from '@/components/perfil/push-preference-fields'
import { describePushPreferences } from '@/lib/push/preferences'
import {
  getNotificationPermission,
  isPushSupported,
  subscribeToPushNotifications,
} from '@/lib/push/client'
import { cn } from '@/lib/utils'

interface PushNotificationSettingsProps {
  pushRemindersEnabled: boolean
  pushKickoffEnabled: boolean
  pushSurpriseEnabled: boolean
  pushSubscriptionCount: number
  showSurpriseOption: boolean
}

export function PushNotificationSettings({
  pushRemindersEnabled,
  pushKickoffEnabled,
  pushSurpriseEnabled,
  pushSubscriptionCount,
  showSurpriseOption,
}: PushNotificationSettingsProps) {
  const router = useRouter()
  const [values, setValues] = useState<PushPreferenceValues>({
    reminders: pushRemindersEnabled,
    kickoff: pushKickoffEnabled,
    surprise: pushSurpriseEnabled,
  })
  const [isPending, startTransition] = useTransition()

  const supported = isPushSupported()
  const permission = supported ? getNotificationPermission() : 'unsupported'
  const hasSubscription = pushSubscriptionCount > 0
  const anyEnabled = values.reminders || values.kickoff || (showSurpriseOption && values.surprise)

  function persistPreferences(next: PushPreferenceValues) {
    startTransition(async () => {
      const needsSubscription = next.reminders || next.kickoff || (showSurpriseOption && next.surprise)

      try {
        if (needsSubscription && !hasSubscription) {
          await subscribeToPushNotifications(next)
          setValues(next)
          toast.success('Notificaciones activadas en este dispositivo.')
          router.refresh()
          return
        }

        const result = await updatePushPreferences(next)
        if (!result.ok) {
          toast.error(result.error)
          return
        }

        setValues(next)
        toast.success(result.message)
        router.refresh()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'No se pudieron guardar las preferencias.'
        toast.error(message)
      }
    })
  }

  function handleChange(next: PushPreferenceValues) {
    setValues(next)
    persistPreferences(next)
  }

  return (
    <div id="notificaciones" className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bell className="size-5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-foreground">Notificaciones push</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada tipo es independiente: podés tener solo recordatorio, solo kick-off, o cualquier
            combinación.
          </p>

          {supported ? (
            <div className="mt-4">
              <PushPreferenceFields
                values={values}
                onChange={handleChange}
                showSurprise={showSurpriseOption}
                disabled={isPending}
              />
            </div>
          ) : (
            <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
              <Smartphone className="mt-0.5 size-4 shrink-0" aria-hidden />
              Usá Chrome o Safari en el celular e instalá la PWA para activar avisos.
            </p>
          )}

          {supported && permission === 'denied' ? (
            <p className="mt-3 text-sm text-destructive">
              Bloqueaste las notificaciones en el navegador. Habilitalas en la configuración del
              sitio.
            </p>
          ) : null}

          {hasSubscription ? (
            <p className={cn('mt-3 text-xs', anyEnabled ? 'text-brand-gold' : 'text-muted-foreground')}>
              {anyEnabled
                ? `${describePushPreferences({
                    pushRemindersEnabled: values.reminders,
                    pushKickoffEnabled: values.kickoff,
                    pushSurpriseEnabled: showSurpriseOption && values.surprise,
                  })} · ${pushSubscriptionCount === 1 ? '1 dispositivo' : `${pushSubscriptionCount} dispositivos`}`
                : 'Sin tipos activos (seguís suscripto en este dispositivo).'}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
