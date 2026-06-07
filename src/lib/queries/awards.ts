import { testTeamVisibilityFilter } from '@/lib/auth/test-access'
import { prisma } from '@/lib/prisma'

export type AwardPlayerOption = {
  id: string
  name: string
  position: string
  teamId: string
  teamNameEs: string
  iso2: string
  flagEmoji: string
}

export type AwardTeamOption = {
  id: string
  nameEs: string
  iso2: string
  flagEmoji: string
}

export async function getAwardPickOptions(includeTestContent: boolean) {
  const [teams, players] = await Promise.all([
    prisma.team.findMany({
      where: testTeamVisibilityFilter(includeTestContent),
      select: { id: true, nameEs: true, iso2: true, flagEmoji: true },
      orderBy: { nameEs: 'asc' },
    }),
    prisma.player.findMany({
      where: { team: testTeamVisibilityFilter(includeTestContent) },
      include: {
        team: { select: { id: true, nameEs: true, iso2: true, flagEmoji: true } },
      },
      orderBy: [{ team: { nameEs: 'asc' } }, { name: 'asc' }],
    }),
  ])

  return {
    teams: teams satisfies AwardTeamOption[],
    players: players.map((player) => ({
      id: player.id,
      name: player.name,
      position: player.position,
      teamId: player.teamId,
      teamNameEs: player.team.nameEs,
      iso2: player.team.iso2,
      flagEmoji: player.team.flagEmoji,
    })) satisfies AwardPlayerOption[],
  }
}

export async function getUserAwardPredictionsMap(userId: string) {
  const predictions = await prisma.awardPrediction.findMany({
    where: { userId },
    include: {
      player: {
        select: { id: true, name: true, position: true, teamId: true },
      },
      team: {
        select: { id: true, nameEs: true, iso2: true, flagEmoji: true },
      },
    },
  })

  return new Map(predictions.map((prediction) => [prediction.awardId, prediction]))
}
