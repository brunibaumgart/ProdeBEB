import { matchWithRelations } from '@/lib/queries/matches'
import { prisma } from '@/lib/prisma'

const UPCOMING_LIMIT = 12
const FINISHED_LIMIT = 12

export async function getAdminMatchesOverview() {
  const now = new Date()

  const [live, readyForResult, upcoming, finished, upcomingTotal, finishedTotal] =
    await Promise.all([
      prisma.match.findMany({
        where: { status: 'live' },
        include: matchWithRelations,
        orderBy: { date: 'asc' },
      }),
      prisma.match.findMany({
        where: {
          status: 'scheduled',
          date: { lte: now },
          homeTeamId: { not: null },
          awayTeamId: { not: null },
        },
        include: matchWithRelations,
        orderBy: { date: 'asc' },
      }),
      prisma.match.findMany({
        where: { status: 'scheduled', date: { gt: now } },
        include: matchWithRelations,
        orderBy: { date: 'asc' },
        take: UPCOMING_LIMIT,
      }),
      prisma.match.findMany({
        where: { status: 'finished' },
        include: matchWithRelations,
        orderBy: { date: 'desc' },
        take: FINISHED_LIMIT,
      }),
      prisma.match.count({ where: { status: 'scheduled', date: { gt: now } } }),
      prisma.match.count({ where: { status: 'finished' } }),
    ])

  return {
    live,
    readyForResult,
    upcoming,
    finished,
    upcomingTotal,
    finishedTotal,
  }
}

export interface MatchStatistics {
  totalPredictions: number
  exactHits: number
  outcomeDistribution: {
    home: number
    draw: number
    away: number
  }
}

export async function getMatchGoalsByMatchIds(matchIds: number[]) {
  const map = new Map<number, { home: string[]; away: string[] }>()
  if (matchIds.length === 0) return map

  const goals = await prisma.matchGoal.findMany({
    where: { matchId: { in: matchIds } },
    orderBy: [{ isHome: 'desc' }, { id: 'asc' }],
    select: { matchId: true, playerId: true, isHome: true },
  })

  for (const goal of goals) {
    const entry = map.get(goal.matchId) ?? { home: [], away: [] }
    if (goal.isHome) entry.home.push(goal.playerId)
    else entry.away.push(goal.playerId)
    map.set(goal.matchId, entry)
  }

  return map
}

export async function getMatchStatistics(matchId: number): Promise<MatchStatistics> {
  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    select: { predHome: true, predAway: true, points: true },
  })

  const totalPredictions = predictions.length
  let home = 0
  let draw = 0
  let away = 0
  let exactHits = 0

  for (const prediction of predictions) {
    if (prediction.predHome > prediction.predAway) home++
    else if (prediction.predHome < prediction.predAway) away++
    else draw++

    if (prediction.points != null && prediction.points >= 3) exactHits++
  }

  return {
    totalPredictions,
    exactHits,
    outcomeDistribution: { home, draw, away },
  }
}

export async function getAdminUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      clerkId: true,
      name: true,
      email: true,
      isAdmin: true,
      isTester: true,
      createdAt: true,
      _count: { select: { predictions: true, memberships: true } },
      memberships: {
        where: { tournament: { code: 'GLOBAL' } },
        select: { pointsTotal: true },
        take: 1,
      },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getAdminTournaments() {
  return prisma.tournament.findMany({
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export type AdminPredictionView = {
  id: string
  userId: string
  userName: string
  userEmail: string
  predHome: number
  predAway: number
  points: number | null
  pointsScorers: number | null
  scorerNames: string[]
}

const adminPredictionInclude = {
  user: { select: { id: true, name: true, email: true } },
  scorers: {
    include: { player: { select: { name: true } } },
    orderBy: { id: 'asc' as const },
  },
} as const

function mapAdminPrediction(
  prediction: {
    id: string
    userId: string
    predHome: number
    predAway: number
    points: number | null
    pointsScorers: number | null
    user: { id: string; name: string; email: string }
    scorers: { player: { name: string } }[]
  },
): AdminPredictionView {
  return {
    id: prediction.id,
    userId: prediction.userId,
    userName: prediction.user.name,
    userEmail: prediction.user.email,
    predHome: prediction.predHome,
    predAway: prediction.predAway,
    points: prediction.points,
    pointsScorers: prediction.pointsScorers,
    scorerNames: prediction.scorers.map((scorer) => scorer.player.name),
  }
}

export async function getAdminMatchPredictions(matchId: number): Promise<AdminPredictionView[]> {
  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    include: adminPredictionInclude,
    orderBy: [{ points: 'desc' }, { user: { name: 'asc' } }],
  })

  return predictions.map(mapAdminPrediction)
}

export async function getAdminPredictionsByMatchIds(matchIds: number[]) {
  const map = new Map<number, AdminPredictionView[]>()
  if (matchIds.length === 0) return map

  const predictions = await prisma.prediction.findMany({
    where: { matchId: { in: matchIds } },
    include: adminPredictionInclude,
    orderBy: [{ points: 'desc' }, { user: { name: 'asc' } }],
  })

  for (const prediction of predictions) {
    const row = mapAdminPrediction(prediction)
    const list = map.get(prediction.matchId) ?? []
    list.push(row)
    map.set(prediction.matchId, list)
  }

  return map
}

export async function getAdminMatchesForPredictions() {
  return prisma.match.findMany({
    where: { predictions: { some: {} } },
    include: {
      homeTeam: { select: { nameEs: true, iso2: true, flagEmoji: true } },
      awayTeam: { select: { nameEs: true, iso2: true, flagEmoji: true } },
      _count: { select: { predictions: true } },
    },
    orderBy: { date: 'desc' },
    take: 150,
  })
}

export async function getAdminUserPredictions(userId: string) {
  return prisma.prediction.findMany({
    where: { userId },
    include: {
      match: {
        include: {
          homeTeam: { select: { nameEs: true, iso2: true, flagEmoji: true } },
          awayTeam: { select: { nameEs: true, iso2: true, flagEmoji: true } },
        },
      },
      scorers: {
        include: { player: { select: { name: true } } },
        orderBy: { id: 'asc' },
      },
    },
    orderBy: { match: { date: 'desc' } },
  })
}

export async function getAdminPushNotificationOverview() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      pushRemindersEnabled: true,
      pushKickoffEnabled: true,
      pushSurpriseEnabled: true,
      pushSetupPromptSeenAt: true,
      _count: { select: { pushSubscriptions: true } },
      pushSubscriptions: {
        select: { updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  })
}
