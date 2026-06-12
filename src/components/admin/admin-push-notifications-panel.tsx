'use client'

import { Bell, BellOff, Search, Smartphone, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Input } from '@/components/ui/input'
import {
  describePushPreferences,
  hasAnyPushPreferenceEnabled,
} from '@/lib/push/preferences'
import { formatArgentinaDate } from '@/lib/time'
import { cn } from '@/lib/utils'

export type AdminPushNotificationRow = {
  id: string
  name: string
  email: string
  pushRemindersEnabled: boolean
  pushKickoffEnabled: boolean
  pushSurpriseEnabled: boolean
  pushSetupPromptSeenAt: Date | null
  subscriptionCount: number
  lastSubscriptionAt: Date | null
}

type Props = {
  users: AdminPushNotificationRow[]
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function PreferenceBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1',
        active
          ? 'bg-brand-green/15 text-brand-green ring-brand-green/25'
          : 'bg-muted/40 text-muted-foreground ring-border/60',
      )}
    >
      {label}
    </span>
  )
}

function pushStatus(user: AdminPushNotificationRow) {
  const hasSubscription = user.subscriptionCount > 0
  const hasPreferences = hasAnyPushPreferenceEnabled({
    pushRemindersEnabled: user.pushRemindersEnabled,
    pushKickoffEnabled: user.pushKickoffEnabled,
    pushSurpriseEnabled: user.pushSurpriseEnabled,
  })

  if (hasSubscription && hasPreferences) {
    return { label: 'Activo', className: 'text-brand-green' }
  }
  if (hasSubscription) {
    return { label: 'Suscripto', className: 'text-brand-gold' }
  }
  if (user.pushSetupPromptSeenAt) {
    return { label: 'Vio prompt', className: 'text-muted-foreground' }
  }
  return { label: 'Sin activar', className: 'text-muted-foreground' }
}

export function AdminPushNotificationsPanel({ users }: Props) {
  const [search, setSearch] = useState('')
  const [onlyActive, setOnlyActive] = useState(true)

  const stats = useMemo(() => {
    const subscribed = users.filter((user) => user.subscriptionCount > 0)
    return {
      subscribed: subscribed.length,
      reminders: subscribed.filter((user) => user.pushRemindersEnabled).length,
      kickoff: subscribed.filter((user) => user.pushKickoffEnabled).length,
      surprise: subscribed.filter((user) => user.pushSurpriseEnabled).length,
    }
  }, [users])

  const filtered = useMemo(() => {
    const q = normalize(search)

    return users.filter((user) => {
      const hasSubscription = user.subscriptionCount > 0
      const hasPreferences = hasAnyPushPreferenceEnabled({
        pushRemindersEnabled: user.pushRemindersEnabled,
        pushKickoffEnabled: user.pushKickoffEnabled,
        pushSurpriseEnabled: user.pushSurpriseEnabled,
      })
      const isRelevant = hasSubscription || hasPreferences || user.pushSetupPromptSeenAt

      if (onlyActive && !isRelevant) return false
      if (!q) return true

      return normalize(user.name).includes(q) || normalize(user.email).includes(q)
    })
  }, [onlyActive, search, users])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aActive = a.subscriptionCount > 0 ? 1 : 0
      const bActive = b.subscriptionCount > 0 ? 1 : 0
      if (aActive !== bActive) return bActive - aActive
      return a.name.localeCompare(b.name, 'es')
    })
  }, [filtered])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bell className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-xl tracking-wide">SUSCRIPCIONES PUSH</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Quién tiene dispositivos suscriptos y qué tipos de aviso eligió en perfil.
            </p>
          </div>
        </div>

        <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <dt className="text-xs text-muted-foreground">Con dispositivo</dt>
            <dd className="font-heading text-2xl tabular-nums text-primary">{stats.subscribed}</dd>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <dt className="text-xs text-muted-foreground">Recordatorio 11:00</dt>
            <dd className="font-heading text-2xl tabular-nums">{stats.reminders}</dd>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <dt className="text-xs text-muted-foreground">Arranque partidos</dt>
            <dd className="font-heading text-2xl tabular-nums">{stats.kickoff}</dd>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <dt className="text-xs text-muted-foreground">Sorpresas</dt>
            <dd className="font-heading text-2xl tabular-nums">{stats.surprise}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9 pr-9"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(event) => setOnlyActive(event.target.checked)}
            className="size-4 accent-primary"
          />
          Solo con actividad push
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        {sorted.length} de {users.length} usuarios
        {search ? ` · filtro: “${search}”` : ''}
      </p>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">Usuario</th>
                <th className="px-4 py-2.5 text-left font-medium">Estado</th>
                <th className="px-4 py-2.5 text-right font-medium">Dispositivos</th>
                <th className="px-4 py-2.5 text-left font-medium">Preferencias</th>
                <th className="px-4 py-2.5 text-left font-medium">Última suscripción</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Ningún usuario coincide con el filtro.
                  </td>
                </tr>
              ) : (
                sorted.map((user) => {
                  const status = pushStatus(user)
                  const preferences = describePushPreferences({
                    pushRemindersEnabled: user.pushRemindersEnabled,
                    pushKickoffEnabled: user.pushKickoffEnabled,
                    pushSurpriseEnabled: user.pushSurpriseEnabled,
                  })

                  return (
                    <tr key={user.id} className="border-b border-border/40 last:border-0">
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', status.className)}>
                          {user.subscriptionCount > 0 ? (
                            <Bell className="size-3.5" aria-hidden />
                          ) : (
                            <BellOff className="size-3.5" aria-hidden />
                          )}
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="inline-flex items-center justify-end gap-1 tabular-nums">
                          <Smartphone className="size-3.5 text-muted-foreground" aria-hidden />
                          {user.subscriptionCount}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          <PreferenceBadge active={user.pushRemindersEnabled} label="11:00" />
                          <PreferenceBadge active={user.pushKickoffEnabled} label="Kick-off" />
                          <PreferenceBadge active={user.pushSurpriseEnabled} label="Sorpresas" />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{preferences}</p>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {user.lastSubscriptionAt
                          ? formatArgentinaDate(user.lastSubscriptionAt)
                          : user.pushSetupPromptSeenAt
                            ? `Prompt ${formatArgentinaDate(user.pushSetupPromptSeenAt)}`
                            : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
