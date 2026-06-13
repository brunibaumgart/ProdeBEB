import { isPioProfile } from '@/lib/personal/pio-countdown'

export const SURPRISE_PUSH_EMAIL = 'brunoenzobaumgart@gmail.com'

export interface PushPreferenceUser {
  name: string
  email: string
  isAdmin?: boolean
  clerkId?: string
}

export interface PushPreferences {
  pushRemindersEnabled: boolean
  pushKickoffEnabled: boolean
  pushSurpriseEnabled: boolean
}

export function canReceiveSurprisePush(user: PushPreferenceUser): boolean {
  return isPioProfile(user) || user.email.trim().toLowerCase() === SURPRISE_PUSH_EMAIL
}

/** UI del perfil / onboarding: pio no ve el toggle (Bruno lo activa desde admin/DB). */
export function shouldShowSurprisePushOption(user: PushPreferenceUser): boolean {
  return canReceiveSurprisePush(user) && !isPioProfile(user)
}

export function hasAnyPushPreferenceEnabled(preferences: PushPreferences): boolean {
  return (
    preferences.pushRemindersEnabled ||
    preferences.pushKickoffEnabled ||
    preferences.pushSurpriseEnabled
  )
}

export function describePushPreferences(preferences: PushPreferences): string {
  if (!hasAnyPushPreferenceEnabled(preferences)) return 'Sin notificaciones activas'

  return [
    preferences.pushRemindersEnabled && 'Recordatorio 11:00',
    preferences.pushKickoffEnabled && 'Arranque de partidos',
    preferences.pushSurpriseEnabled && 'Sorpresas',
  ]
    .filter(Boolean)
    .join(' · ')
}
