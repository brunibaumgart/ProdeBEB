'use client'

import { Bell, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { dismissPushReminderPrompt } from '@/app/actions/push'
import { isPushSupported } from '@/lib/push/client'

interface PushReminderPromptProps {
  show: boolean
}

export function PushReminderPrompt({ show }: PushReminderPromptProps) {
  const router = useRouter()
  const [visible, setVisible] = useState(show)
  const [isPending, startTransition] = useTransition()

  if (!visible || !isPushSupported()) return null

  function handleDismiss() {
    setVisible(false)
    startTransition(async () => {
      await dismissPushReminderPrompt()
      router.refresh()
    })
  }

  return (
    <div className="border-b border-border bg-muted/40">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Bell className="size-4 shrink-0 text-primary" aria-hidden />
        <p className="min-w-0 flex-1 text-sm text-foreground">
          ¿Querés un recordatorio a las 11:00 con los partidos del día?{' '}
          <Link href="/perfil#notificaciones" className="font-medium text-primary hover:underline">
            Activá notificaciones
          </Link>
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={isPending}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          aria-label="Cerrar"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
