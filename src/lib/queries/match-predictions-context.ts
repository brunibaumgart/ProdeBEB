import { formatScorerSlotLabel, scorerSlotToId } from '@/lib/scoring/scorers'
import { prisma } from '@/lib/prisma'
import {
  canRevealTournamentMemberPredictions,
  getTournamentPredictionRevealMessage,
  isPrivateTournament,
} from '@/lib/tournament/predictions-visibility'
import type { TournamentMemberPredictionView } from '@/lib/queries/tournament-predictions'

export type UserMatchPredictionDetail = {
  predHome: number
  predAway: number
  predPenaltiesWinnerId: string | null
  points: number | null
  pointsScorers: number | null
  scorerNames: string[]
}

export type TournamentMatchPredictionsGroup = {
  tournamentId: string
  tournamentName: string
  canReveal: boolean
  predictionCount: number
  predictions: TournamentMemberPredictionView[]
}

export type MatchPredictionsContext = {
  canRevealTournamentPredictions: boolean
  userPrediction: UserMatchPredictionDetail | null
  tournaments: TournamentMatchPredictionsGroup[]
}

function mapMemberPrediction(prediction: {
  id: string
  userId: string
  predHome: number
  predAway: number
  predPenaltiesWinnerId: string | null
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
    predPenaltiesWinnerId: prediction.predPenaltiesWinnerId,
    points: prediction.points,
    pointsScorers: prediction.pointsScorers,
    scorerNames: prediction.scorers.map((scorer) =>
      formatScorerSlotLabel(scorerSlotToId(scorer), scorer.player?.name),
    ),
  }
}

function mapUserPrediction(
  prediction: {
    predHome: number
    predAway: number
    predPenaltiesWinnerId: string | null
    points: number | null
    pointsScorers: number | null
    scorers: { playerId: string | null; isOwnGoal: boolean; player: { name: string } | null }[]
  } | null,
): UserMatchPredictionDetail | null {
  if (!prediction) return null

  return {
    predHome: prediction.predHome,
    predAway: prediction.predAway,
    predPenaltiesWinnerId: prediction.predPenaltiesWinnerId,
    points: prediction.points,
    pointsScorers: prediction.pointsScorers,
    scorerNames: prediction.scorers.map((scorer) =>
      formatScorerSlotLabel(scorerSlotToId(scorer), scorer.player?.name),
    ),
  }
}

export async function getMatchPredictionsContext(
  matchId: number,
  userId: string,
): Promise<MatchPredictionsContext | null> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, date: true, status: true, timeArg: true },
  })

  if (!match) return null

  const canReveal = canRevealTournamentMemberPredictions(match)

  const [userPredictionRow, memberships] = await Promise.all([
    prisma.prediction.findUnique({
      where: { userId_matchId: { userId, matchId } },
      include: {
        scorers: {
          include: { player: { select: { name: true } } },
          orderBy: { id: 'asc' },
        },
      },
    }),
    prisma.tournamentMember.findMany({
      where: { userId },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            code: true,
            isPublic: true,
            modeMatchday: true,
          },
        },
      },
    }),
  ])

  const privateTournaments = memberships
    .map((membership) => membership.tournament)
    .filter((tournament) => isPrivateTournament(tournament) && tournament.modeMatchday)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))

  if (privateTournaments.length === 0) {
    return {
      canRevealTournamentPredictions: canReveal,
      userPrediction: mapUserPrediction(userPredictionRow),
      tournaments: [],
    }
  }

  const tournamentIds = privateTournaments.map((tournament) => tournament.id)

  const members = await prisma.tournamentMember.findMany({
    where: { tournamentId: { in: tournamentIds } },
    select: { tournamentId: true, userId: true },
  })

  const memberIdsByTournament = new Map<string, Set<string>>()
  for (const member of members) {
    const set = memberIdsByTournament.get(member.tournamentId) ?? new Set<string>()
    set.add(member.userId)
    memberIdsByTournament.set(member.tournamentId, set)
  }

  const matchPredictions = await prisma.prediction.findMany({
    where: { matchId },
    include: {
      user: { select: { name: true } },
      scorers: {
        include: { player: { select: { name: true } } },
        orderBy: { id: 'asc' },
      },
    },
    orderBy: [{ points: 'desc' }, { user: { name: 'asc' } }],
  })

  const tournaments: TournamentMatchPredictionsGroup[] = privateTournaments.map((tournament) => {
    const memberIds = memberIdsByTournament.get(tournament.id) ?? new Set<string>()
    const otherMemberPredictions = matchPredictions.filter(
      (prediction) => memberIds.has(prediction.userId) && prediction.userId !== userId,
    )

    return {
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      canReveal,
      predictionCount: otherMemberPredictions.length,
      predictions: canReveal ? otherMemberPredictions.map(mapMemberPrediction) : [],
    }
  })

  return {
    canRevealTournamentPredictions: canReveal,
    userPrediction: mapUserPrediction(userPredictionRow),
    tournaments,
  }
}

export { getTournamentPredictionRevealMessage }
