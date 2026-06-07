import { prisma } from '@/lib/prisma'

const GLOBAL_TOURNAMENT_CODE = 'GLOBAL'

export async function syncTournamentMemberPoints(userId: string) {
  const [matchdayAggregate, scorersAggregate, bracketEntry] = await Promise.all([
    prisma.prediction.aggregate({
      where: { userId, match: { isTest: false } },
      _sum: { points: true },
    }),
    prisma.prediction.aggregate({
      where: { userId, match: { isTest: false } },
      _sum: { pointsScorers: true },
    }),
    prisma.bracketEntry.findUnique({
      where: { userId },
      include: {
        slots: { select: { points: true } },
      },
    }),
  ])

  const pointsMatchday = matchdayAggregate._sum.points ?? 0
  const pointsScorers = scorersAggregate._sum.pointsScorers ?? 0
  const slotPoints =
    bracketEntry?.slots.reduce((sum, slot) => sum + (slot.points ?? 0), 0) ?? 0
  const pointsComplete =
    slotPoints +
    (bracketEntry?.pointsPositions ?? 0) +
    (bracketEntry?.pointsChampion ?? 0) +
    (bracketEntry?.pointsEarlyBonus ?? 0)

  const memberships = await prisma.tournamentMember.findMany({
    where: { userId },
    include: { tournament: true },
  })

  await Promise.all(
    memberships.map((membership) => {
      const pointsTotal =
        (membership.tournament.modeMatchday ? pointsMatchday : 0) +
        (membership.tournament.modeScorers ? pointsScorers : 0) +
        (membership.tournament.modeComplete ? pointsComplete : 0)

      return prisma.tournamentMember.update({
        where: { id: membership.id },
        data: {
          pointsMatchday: membership.tournament.modeMatchday ? pointsMatchday : 0,
          pointsScorers: membership.tournament.modeScorers ? pointsScorers : 0,
          pointsComplete: membership.tournament.modeComplete ? pointsComplete : 0,
          pointsTotal,
        },
      })
    })
  )
}

export async function recalculateUserMatchdayPoints(userId: string) {
  await syncTournamentMemberPoints(userId)
}

export async function recalculateMatchdayPointsForMatch(matchId: number) {
  const userIds = await prisma.prediction.findMany({
    where: { matchId },
    select: { userId: true },
    distinct: ['userId'],
  })

  await Promise.all(userIds.map(({ userId }) => syncTournamentMemberPoints(userId)))
}

export async function advanceKnockoutTeams(
  finishedMatchId: number,
  homeTeamId: string | null,
  awayTeamId: string | null,
  homeScore: number,
  awayScore: number
) {
  if (!homeTeamId || !awayTeamId) return

  let winnerTeamId: string | null = null
  let loserTeamId: string | null = null

  if (homeScore > awayScore) {
    winnerTeamId = homeTeamId
    loserTeamId = awayTeamId
  } else if (awayScore > homeScore) {
    winnerTeamId = awayTeamId
    loserTeamId = homeTeamId
  }

  if (!winnerTeamId) return

  const dependents = await prisma.match.findMany({
    where: {
      OR: [{ homeFromMatchId: finishedMatchId }, { awayFromMatchId: finishedMatchId }],
    },
  })

  for (const dependent of dependents) {
    const data: { homeTeamId?: string; awayTeamId?: string } = {}

    if (dependent.homeFromMatchId === finishedMatchId) {
      const teamId =
        dependent.homeFromPosition === 'winner'
          ? winnerTeamId
          : dependent.homeFromPosition === 'loser'
            ? loserTeamId
            : null
      if (teamId) data.homeTeamId = teamId
    }

    if (dependent.awayFromMatchId === finishedMatchId) {
      const teamId =
        dependent.awayFromPosition === 'winner'
          ? winnerTeamId
          : dependent.awayFromPosition === 'loser'
            ? loserTeamId
            : null
      if (teamId) data.awayTeamId = teamId
    }

    if (Object.keys(data).length > 0) {
      await prisma.match.update({
        where: { id: dependent.id },
        data,
      })
    }
  }
}
