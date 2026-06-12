import { isPioProfile } from '@/lib/personal/pio-countdown'

export const DEFAULT_PUSH_ICON = '/icon'
export const PIO_PUSH_ICON = '/brand/beb-pollitos.png'

export function getPushNotificationIcon(user: { name: string }): string {
  if (isPioProfile(user.name)) return PIO_PUSH_ICON
  return DEFAULT_PUSH_ICON
}
