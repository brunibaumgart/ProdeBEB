import { prisma } from '@/lib/prisma'

export async function getUserTournaments(userId: string) {
  const memberships = await prisma.tournamentMember.findMany({
    where: { userId },
    include: {
      tournament: {
        include: {
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })

  const ranks = await Promise.all(
    memberships.map(({ tournamentId }) => getMemberRankMatchday(tournamentId, userId))
  )

  return memberships.map((membership, index) => ({
    membership,
    tournament: membership.tournament,
    memberCount: membership.tournament._count.members,
    rankMatchday: ranks[index],
  }))
}

async function getMemberRankMatchday(tournamentId: string, userId: string) {
  const member = await prisma.tournamentMember.findUnique({
    where: { userId_tournamentId: { userId, tournamentId } },
    select: { pointsMatchday: true },
  })
  if (!member) return null

  const ahead = await prisma.tournamentMember.count({
    where: { tournamentId, pointsMatchday: { gt: member.pointsMatchday } },
  })

  return ahead + 1
}

export async function getTournamentById(id: string) {
  return prisma.tournament.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
  })
}

export async function getTournamentLeaderboard(tournamentId: string) {
  return prisma.tournamentMember.findMany({
    where: { tournamentId },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: [{ pointsTotal: 'desc' }, { joinedAt: 'asc' }],
  })
}

export async function findTournamentByCode(code: string) {
  return prisma.tournament.findUnique({ where: { code: code.toUpperCase() } })
}
