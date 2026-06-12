'use client'

import { Bell, Download, Smartphone, Sparkles, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { dismissPushSetupPrompt } from '@/app/actions/push'
import {
  PushPreferenceFields,
  type PushPreferenceValues,
} from '@/components/perfil/push-preference-fields'
import { Button } from '@/components/ui/button'
import { canReceiveSurprisePush } from '@/lib/push/preferences'
import { isPushSupported, subscribeToPushNotifications } from '@/lib/push/client'
import {
  canShowPwaInstallHint,
  isIosDevice,
  isPwaStandalone,
} from '@/lib/pwa/install'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PushOnboardingPromptProps {
  show: boolean
  userName: string
  userEmail: string
  isAdmin: boolean
}

export function PushOnboardingPrompt({
  show,
  userName,
  userEmail,
  isAdmin,
}: PushOnboardingPromptProps) {
  const router = useRouter()
  const [visible, setVisible] = useState(show)
  const [isPending, startTransition] = useTransition()
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  const showSurprise = canReceiveSurprisePush({ name: userName, email: userEmail, isAdmin })
  const supported = isPushSupported()

  const [preferences, setPreferences] = useState<PushPreferenceValues>({
    reminders: true,
    kickoff: isAdmin,
    surprise: showSurprise,
  })

  useEffect(() => {
    setInstalled(isPwaStandalone())
  }, [])

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  if (!visible) return null

  const wantsAnyPreference =
    preferences.reminders || preferences.kickoff || (showSurprise && preferences.surprise)

  function handleDismiss() {
    setVisible(false)
    startTransition(async () => {
      await dismissPushSetupPrompt()
      router.refresh()
    })
  }

  async function handleInstallPwa() {
    if (installPrompt) {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setInstalled(true)
        setInstallPrompt(null)
        toast.success('ProdeBEB instalado en tu pantalla de inicio.')
      }
      return
    }

    if (isIosDevice()) {
      toast.message('En Safari: Compartir → Agregar a inicio.')
    }
  }

  function handleActivate() {
    if (!supported) {
      toast.error('Tu navegador no soporta notificaciones push en este dispositivo.')
      return
    }

    if (!wantsAnyPreference) {
      toast.error('Elegí al menos un tipo de notificación.')
      return
    }

    startTransition(async () => {
      try {
        await subscribeToPushNotifications(preferences)
        setVisible(false)
        toast.success('Notificaciones activadas.')
        router.refresh()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'No se pudieron activar las notificaciones.'
        toast.error(message)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="push-onboarding-title"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bell className="size-5" aria-hidden />
            </div>
            <div>
              <h2 id="push-onboarding-title" className="font-heading text-xl tracking-wide">
                PRODEBEB EN TU CELU
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Instalá la app y elegí qué avisos querés. Podés activar solo algunos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isPending}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {canShowPwaInstallHint() && !installed ? (
            <div className="rounded-xl border border-brand-gold/30 bg-brand-gold/10 p-4">
              <div className="flex items-start gap-3">
                <Download className="mt-0.5 size-4 shrink-0 text-brand-gold" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Agregar a la pantalla de inicio</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isIosDevice()
                      ? 'Safari → Compartir → Agregar a inicio. Así las notificaciones funcionan mejor.'
                      : 'Instalá la PWA para abrirla como app y recibir avisos al toque.'}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3 border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10"
                    onClick={() => void handleInstallPwa()}
                  >
                    {installPrompt ? 'Instalar ProdeBEB' : 'Cómo instalar'}
                  </Button>
                </div>
              </div>
            </div>
          ) : installed ? (
            <p className="flex items-center gap-2 text-sm text-brand-green">
              <Smartphone className="size-4" aria-hidden />
              App instalada en este dispositivo.
            </p>
          ) : null}

          {supported ? (
            <>
              <PushPreferenceFields
                values={preferences}
                onChange={setPreferences}
                showSurprise={showSurprise}
                disabled={isPending}
              />
              {showSurprise ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="size-3.5 text-brand-gold" aria-hidden />
                  Las sorpresas son exclusivas para tu cuenta.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Las notificaciones push funcionan en Chrome/Edge (Android o desktop) o Safari en iPhone
              con la app instalada.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border/70 px-5 py-4">
          {supported ? (
            <Button type="button" onClick={handleActivate} disabled={isPending || !wantsAnyPreference}>
              {isPending ? 'Activando…' : 'Activar notificaciones'}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={handleDismiss} disabled={isPending}>
            Ahora no
          </Button>
        </div>
      </div>
    </div>
  )
}
