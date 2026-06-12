import type { Prisma } from '@prisma/client'

import { isPlatformAdmin } from '@/lib/auth/test-access'

/** Mientras sea true, solo admins ven la UI y reciben el cron. Sacar en prod general. */
export function isPushRemindersAdminOnly(): boolean {
  return process.env.PUSH_REMINDERS_ADMIN_ONLY === 'true'
}

export function canUsePushReminders(user: { clerkId: string; isAdmin: boolean }): boolean {
  if (!isPushRemindersAdminOnly()) return true
  return isPlatformAdmin(user)
}

export function pushReminderUserFilter(): Prisma.UserWhereInput {
  if (!isPushRemindersAdminOnly()) return {}

  const adminClerkId = process.env.ADMIN_USER_ID?.trim()
  const or: Prisma.UserWhereInput[] = [{ isAdmin: true }]
  if (adminClerkId) or.push({ clerkId: adminClerkId })

  return { OR: or }
}
