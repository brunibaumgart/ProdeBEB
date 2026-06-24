import { auth, currentUser } from '@clerk/nextjs/server'

import { syncUserFromClerk } from '@/lib/auth/sync-user'
import { isPioProfile } from '@/lib/personal/pio-countdown'
import { prisma } from '@/lib/prisma'
import { SURPRISE_PUSH_EMAIL } from '@/lib/push/preferences'

export const USERNAME_REQUIRED_MESSAGE = 'Elegí tu nombre de usuario primero.'

export async function getUserFriendlyPoints(userId: string) {
  const aggregate = await prisma.prediction.aggregate({
    where: { userId, match: { isTest: true } },
    _sum: { points: true, pointsScorers: true },
  })

  return (aggregate._sum.points ?? 0) + (aggregate._sum.pointsScorers ?? 0)
}

export async function ensureDbUser() {
  const { userId } = await auth()
  if (!userId) return null

  const existing = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (existing) return existing

  const clerkUser = await currentUser()
  if (!clerkUser) return null

  return syncUserFromClerk(clerkUser)
}

export async function requireDbUserForAction() {
  const user = await ensureDbUser()
  if (!user) return { ok: false as const, error: 'Tenés que iniciar sesión.' }
  if (!user.hasChosenUsername) return { ok: false as const, error: USERNAME_REQUIRED_MESSAGE }
  return { ok: true as const, user }
}

export async function getDbUserByClerkId(clerkId: string) {
  return prisma.user.findUnique({ where: { clerkId } })
}

/**
 * Solo para pio y Bruno: devuelve el usuario "contraparte" del par
 * (a pio le corresponde Bruno y viceversa) junto con la etiqueta a mostrar.
 * Para cualquier otro usuario devuelve null.
 */
export async function getPioBrunoCounterpart(user: { name: string | null; email: string }) {
  if (isPioProfile(user)) {
    const bruno = await prisma.user.findFirst({
      where: { email: { equals: SURPRISE_PUSH_EMAIL, mode: 'insensitive' } },
    })
    return bruno ? { label: 'Predicción de Bruno', user: bruno } : null
  }

  if (user.email.trim().toLowerCase() === SURPRISE_PUSH_EMAIL) {
    const pio = await prisma.user.findFirst({
      where: { name: { equals: 'pio', mode: 'insensitive' } },
    })
    return pio ? { label: 'Predicción de Pío', user: pio } : null
  }

  return null
}

export async function getUserProfileStats(userId: string, options?: { includeFriendly?: boolean }) {
  const [membership, predictions, recentPredictions, pointsFriendly] = await Promise.all([
    prisma.tournamentMember.findFirst({
      where: {
        userId,
        tournament: { code: 'GLOBAL' },
      },
    }),
    prisma.prediction.findMany({
      where: { userId, match: { isTest: false } },
      select: { points: true },
    }),
    prisma.prediction.findMany({
      where: { userId, match: { isTest: false } },
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    options?.includeFriendly ? getUserFriendlyPoints(userId) : Promise.resolve(0),
  ])

  const scored = predictions.filter((prediction) => prediction.points != null)
  const hitRate =
    scored.length > 0
      ? Math.round(
          (scored.filter((prediction) => (prediction.points ?? 0) > 0).length / scored.length) *
            100
        )
      : 0

  return {
    pointsMatchday: membership?.pointsMatchday ?? 0,
    pointsScorers: membership?.pointsScorers ?? 0,
    pointsComplete: membership?.pointsComplete ?? 0,
    pointsTotal: membership?.pointsTotal ?? 0,
    pointsFriendly,
    predictionsCount: predictions.length,
    hitRate,
    recentPredictions,
  }
}
