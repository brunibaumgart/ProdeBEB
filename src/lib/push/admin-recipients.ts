import type { Prisma } from '@prisma/client'

import { isPlatformAdmin } from '@/lib/auth/test-access'
import { canReceiveSurprisePush } from '@/lib/push/preferences'
import { prisma } from '@/lib/prisma'

export function adminUserWhere(): Prisma.UserWhereInput {
  const adminClerkId = process.env.ADMIN_USER_ID?.trim()
  const or: Prisma.UserWhereInput[] = [{ isAdmin: true }]
  if (adminClerkId) or.push({ clerkId: adminClerkId })

  return { OR: or }
}

export async function getAdminUsersWithPushSubscriptions() {
  return prisma.user.findMany({
    where: {
      ...adminUserWhere(),
      pushSubscriptions: { some: {} },
    },
    include: { pushSubscriptions: true },
  })
}

/** Usuarios que quieren aviso de kick-off (+ admins con suscripción). */
export async function getKickoffPushRecipients() {
  return prisma.user.findMany({
    where: {
      pushSubscriptions: { some: {} },
      OR: [{ pushKickoffEnabled: true }, adminUserWhere()],
    },
    include: { pushSubscriptions: true },
  })
}

/** Usuarios elegibles (pio / Bruno) con sorpresas activadas. */
export async function getSurprisePushRecipients() {
  return getOsitoSurpriseEligibleUsers({ requireSurpriseEnabled: true })
}

/** pio + Bruno con push suscripto (sin exigir toggle de sorpresas). */
export async function getOsitoSurprisePushRecipients() {
  return getOsitoSurpriseEligibleUsers({ requireSurpriseEnabled: false })
}

async function getOsitoSurpriseEligibleUsers(options: { requireSurpriseEnabled: boolean }) {
  const users = await prisma.user.findMany({
    where: {
      ...(options.requireSurpriseEnabled ? { pushSurpriseEnabled: true } : {}),
      pushSubscriptions: { some: {} },
    },
    include: { pushSubscriptions: true },
  })

  return users.filter((user) =>
    canReceiveSurprisePush({
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      clerkId: user.clerkId,
    }),
  )
}

export function userReceivesKickoffPush(user: {
  pushKickoffEnabled: boolean
  isAdmin: boolean
  clerkId: string
}): boolean {
  return user.pushKickoffEnabled || isPlatformAdmin(user)
}
