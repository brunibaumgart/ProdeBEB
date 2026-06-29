import { matchWithRelations } from '@/lib/queries/matches'
import { prisma } from '@/lib/prisma'
import { formatScorerSlotLabel, scorerSlotToId } from '@/lib/scoring/scorers'

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
    select: { matchId: true, playerId: true, isHome: true, isOwnGoal: true },
  })

  for (const goal of goals) {
    const entry = map.get(goal.matchId) ?? { home: [], away: [] }
    const slotId = scorerSlotToId(goal)
    if (goal.isHome) entry.home.push(slotId)
    else entry.away.push(slotId)
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
  penaltiesWinnerFlag: string | null
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
  match: {
    select: {
      round: true,
      homeTeamId: true,
      awayTeamId: true,
      homeTeam: { select: { flagEmoji: true } },
      awayTeam: { select: { flagEmoji: true } },
    },
  },
} as const

function mapAdminPrediction(
  prediction: {
    id: string
    userId: string
    predHome: number
    predAway: number
    predPenaltiesWinnerId: string | null
    points: number | null
    pointsScorers: number | null
    user: { id: string; name: string; email: string }
    scorers: { playerId: string | null; player: { name: string } | null; isOwnGoal: boolean }[]
    match: {
      round: string
      homeTeamId: string | null
      awayTeamId: string | null
      homeTeam: { flagEmoji: string } | null
      awayTeam: { flagEmoji: string } | null
    }
  },
): AdminPredictionView {
  const isKnockout = prediction.match.round !== 'Group Stage'
  let penaltiesWinnerFlag: string | null = null
  if (isKnockout && prediction.predPenaltiesWinnerId) {
    if (prediction.predPenaltiesWinnerId === prediction.match.homeTeamId) {
      penaltiesWinnerFlag = prediction.match.homeTeam?.flagEmoji ?? null
    } else if (prediction.predPenaltiesWinnerId === prediction.match.awayTeamId) {
      penaltiesWinnerFlag = prediction.match.awayTeam?.flagEmoji ?? null
    }
  }
  return {
    id: prediction.id,
    userId: prediction.userId,
    userName: prediction.user.name,
    userEmail: prediction.user.email,
    predHome: prediction.predHome,
    predAway: prediction.predAway,
    penaltiesWinnerFlag,
    points: prediction.points,
    pointsScorers: prediction.pointsScorers,
    scorerNames: prediction.scorers.map((scorer) =>
      formatScorerSlotLabel(scorerSlotToId(scorer), scorer.player?.name),
    ),
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

const VISIT_LIST_LIMIT = 50
const VISITOR_NOTE_LIMIT = 100

export async function getAnonymousVisitStats() {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [totalVisits, uniqueVisitors, visitsLast7Days] = await Promise.all([
    prisma.anonymousVisit.count(),
    prisma.anonymousVisit.findMany({ select: { visitorId: true }, distinct: ['visitorId'] }),
    prisma.anonymousVisit.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
  ])

  return {
    totalVisits,
    uniqueVisitors: uniqueVisitors.length,
    visitsLast7Days,
  }
}

export async function getRecentAnonymousVisits(limit = VISIT_LIST_LIMIT) {
  return prisma.anonymousVisit.findMany({
    select: { id: true, visitorId: true, path: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function getVisitorNotes(limit = VISITOR_NOTE_LIMIT) {
  return prisma.visitorNote.findMany({
    select: { id: true, name: true, isAnonymous: true, message: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
