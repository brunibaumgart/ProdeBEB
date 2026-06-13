import { formatScorerSlotLabel, scorerSlotToId } from '@/lib/scoring/scorers'
import { prisma } from '@/lib/prisma'
import { GLOBAL_TOURNAMENT_CODE } from '@/lib/tournament/quota-logic'
import {
  canRevealTournamentMemberPredictions,
  isPrivateTournament,
} from '@/lib/tournament/predictions-visibility'

export type TournamentMemberPredictionView = {
  id: string
  userId: string
  userName: string
  predHome: number
  predAway: number
  points: number | null
  pointsScorers: number | null
  scorerNames: string[]
}

export type TournamentPredictionMatchView = {
  id: number
  date: string
  timeArg: string
  status: string
  homeScore: number | null
  awayScore: number | null
  homeTeam: { nameEs: string; iso2: string; flagEmoji: string } | null
  awayTeam: { nameEs: string; iso2: string; flagEmoji: string } | null
  predictionCount: number
  canReveal: boolean
  isFinished: boolean
  predictions: TournamentMemberPredictionView[]
}

async function assertTournamentMemberAccess(tournamentId: string, userId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, code: true, isPublic: true, modeMatchday: true, name: true },
  })

  if (!tournament || !isPrivateTournament(tournament)) {
    return null
  }

  const membership = await prisma.tournamentMember.findUnique({
    where: { userId_tournamentId: { userId, tournamentId } },
    select: { id: true },
  })

  if (!membership) return null

  return tournament
}

function mapMemberPrediction(prediction: {
  id: string
  userId: string
  predHome: number
  predAway: number
  points: number | null
  pointsScorers: number | null
  user: { name: string }
  scorers: { playerId: string | null; isOwnGoal: boolean; player: { name: string } | null }[]
}): TournamentMemberPredictionView {
  return {
    id: prediction.id,
    userId: prediction.userId,
    userName: prediction.user.name,
    predHome: prediction.predHome,
    predAway: prediction.predAway,
    points: prediction.points,
    pointsScorers: prediction.pointsScorers,
    scorerNames: prediction.scorers.map((scorer) =>
      formatScorerSlotLabel(scorerSlotToId(scorer), scorer.player?.name),
    ),
  }
}

export async function getTournamentPredictionsOverview(
  tournamentId: string,
  userId: string,
): Promise<{ tournamentName: string; matches: TournamentPredictionMatchView[] } | null> {
  const tournament = await assertTournamentMemberAccess(tournamentId, userId)
  if (!tournament || !tournament.modeMatchday) return null

  const members = await prisma.tournamentMember.findMany({
    where: { tournamentId },
    select: { userId: true },
  })
  const memberIds = members.map((member) => member.userId)
  if (memberIds.length === 0) {
    return { tournamentName: tournament.name, matches: [] }
  }

  const memberPredictions = await prisma.prediction.findMany({
    where: { userId: { in: memberIds } },
    select: { matchId: true },
    distinct: ['matchId'],
  })

  const matchIds = memberPredictions.map((prediction) => prediction.matchId)
  if (matchIds.length === 0) {
    return { tournamentName: tournament.name, matches: [] }
  }

  const matches = await prisma.match.findMany({
    where: { id: { in: matchIds } },
    include: {
      homeTeam: { select: { nameEs: true, iso2: true, flagEmoji: true } },
      awayTeam: { select: { nameEs: true, iso2: true, flagEmoji: true } },
    },
    orderBy: [{ date: 'asc' }, { id: 'asc' }],
  })

  const revealableMatchIds = matches
    .filter((match) => canRevealTournamentMemberPredictions(match))
    .map((match) => match.id)

  const revealedPredictions =
    revealableMatchIds.length > 0
      ? await prisma.prediction.findMany({
          where: {
            matchId: { in: revealableMatchIds },
            userId: { in: memberIds },
          },
          include: {
            user: { select: { name: true } },
            scorers: {
              include: { player: { select: { name: true } } },
              orderBy: { id: 'asc' },
            },
          },
          orderBy: [{ points: 'desc' }, { user: { name: 'asc' } }],
        })
      : []

  const predictionsByMatchId = new Map<number, TournamentMemberPredictionView[]>()
  for (const prediction of revealedPredictions) {
    const row = mapMemberPrediction(prediction)
    const list = predictionsByMatchId.get(prediction.matchId) ?? []
    list.push(row)
    predictionsByMatchId.set(prediction.matchId, list)
  }

  const predictionCounts = await prisma.prediction.groupBy({
    by: ['matchId'],
    where: {
      matchId: { in: matchIds },
      userId: { in: memberIds },
    },
    _count: { _all: true },
  })
  const countByMatchId = new Map(predictionCounts.map((entry) => [entry.matchId, entry._count._all]))

  return {
    tournamentName: tournament.name,
    matches: matches.map((match) => {
      const canReveal = canRevealTournamentMemberPredictions(match)
      return {
        id: match.id,
        date: match.date.toISOString(),
        timeArg: match.timeArg,
        status: match.status,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        predictionCount: countByMatchId.get(match.id) ?? 0,
        canReveal,
        isFinished: match.status === 'finished',
        predictions: canReveal ? (predictionsByMatchId.get(match.id) ?? []) : [],
      }
    }),
  }
}

export async function isTournamentPredictionsEnabled(tournamentId: string, userId: string) {
  const tournament = await assertTournamentMemberAccess(tournamentId, userId)
  return tournament?.modeMatchday ?? false
}

export function isGlobalTournamentCode(code: string) {
  return code === GLOBAL_TOURNAMENT_CODE
}
