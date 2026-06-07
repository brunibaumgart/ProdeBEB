import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

function getTesterClerkIds(): string[] {
  return (process.env.TESTER_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

export function isAdminClerkId(clerkId: string | null | undefined): boolean {
  if (!clerkId) return false
  return clerkId === process.env.ADMIN_USER_ID
}

export function isPlatformAdmin(user: {
  clerkId: string
  isAdmin?: boolean
}): boolean {
  return user.isAdmin === true || isAdminClerkId(user.clerkId)
}

export async function canAccessTestContent(clerkId?: string | null): Promise<boolean> {
  if (!clerkId) return false
  if (isAdminClerkId(clerkId)) return true
  if (getTesterClerkIds().includes(clerkId)) return true

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { isTester: true },
  })

  return user?.isTester ?? false
}

export function testMatchVisibilityFilter(
  includeTestMatches: boolean
): Prisma.MatchWhereInput {
  if (includeTestMatches) return {}
  return { isTest: false }
}

export function testTeamVisibilityFilter(
  includeTestContent: boolean
): Prisma.TeamWhereInput {
  if (includeTestContent) return {}
  return { isTest: false }
}
