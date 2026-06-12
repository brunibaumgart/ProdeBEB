import type { Prisma } from '@prisma/client'

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
