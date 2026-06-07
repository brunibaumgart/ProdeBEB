import { prisma } from '@/lib/prisma'

export type TeamWorldCupStats = {
  teamId: string
  nameEs: string
  iso2: string
  flagEmoji: string
  played: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  cleanSheets: number
}

export type ScorerWorldCupStats = {
  playerId: string
  playerName: string
  position: string
  teamNameEs: string
  iso2: string
  flagEmoji: string
  goals: number
}

export type WorldCupStatistics = {
  summary: {
    finishedMatches: number
    totalGoals: number
    avgGoalsPerMatch: number
    uniqueScorers: number
    teamsWithMatches: number
  }
  topScorers: ScorerWorldCupStats[]
  teamsByGoalsScored: TeamWorldCupStats[]
  teamsByGoalsConceded: TeamWorldCupStats[]
  teamsByGoalDifference: TeamWorldCupStats[]
}

type TeamAccumulator = {
  teamId: string
  nameEs: string
  iso2: string
  flagEmoji: string
  played: number
  goalsFor: number
  goalsAgainst: number
  cleanSheets: number
}

function buildTeamStats(map: Map<string, TeamAccumulator>): TeamWorldCupStats[] {
  return [...map.values()]
    .filter((team) => team.played > 0)
    .map((team) => ({
      teamId: team.teamId,
      nameEs: team.nameEs,
      iso2: team.iso2,
      flagEmoji: team.flagEmoji,
      played: team.played,
      goalsFor: team.goalsFor,
      goalsAgainst: team.goalsAgainst,
      goalDifference: team.goalsFor - team.goalsAgainst,
      cleanSheets: team.cleanSheets,
    }))
}

function registerTeamMatch(
  map: Map<string, TeamAccumulator>,
  team: { id: string; nameEs: string; iso2: string; flagEmoji: string },
  goalsFor: number,
  goalsAgainst: number
) {
  const current = map.get(team.id) ?? {
    teamId: team.id,
    nameEs: team.nameEs,
    iso2: team.iso2,
    flagEmoji: team.flagEmoji,
    played: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    cleanSheets: 0,
  }

  current.played += 1
  current.goalsFor += goalsFor
  current.goalsAgainst += goalsAgainst
  if (goalsAgainst === 0) current.cleanSheets += 1

  map.set(team.id, current)
}

export async function getWorldCupStatistics(): Promise<WorldCupStatistics> {
  const finishedMatches = await prisma.match.findMany({
    where: {
      status: 'finished',
      isTest: false,
      homeTeamId: { not: null },
      awayTeamId: { not: null },
      homeScore: { not: null },
      awayScore: { not: null },
    },
    select: {
      id: true,
      homeScore: true,
      awayScore: true,
      homeTeam: {
        select: { id: true, nameEs: true, iso2: true, flagEmoji: true },
      },
      awayTeam: {
        select: { id: true, nameEs: true, iso2: true, flagEmoji: true },
      },
    },
  })

  const teamMap = new Map<string, TeamAccumulator>()
  let totalGoals = 0

  for (const match of finishedMatches) {
    const homeScore = match.homeScore!
    const awayScore = match.awayScore!
    totalGoals += homeScore + awayScore

    if (match.homeTeam && match.awayTeam) {
      registerTeamMatch(teamMap, match.homeTeam, homeScore, awayScore)
      registerTeamMatch(teamMap, match.awayTeam, awayScore, homeScore)
    }
  }

  const teamStats = buildTeamStats(teamMap)

  const [goalRows, uniqueScorerGroups] = await Promise.all([
    prisma.matchGoal.groupBy({
      by: ['playerId'],
      where: {
        match: {
          status: 'finished',
          isTest: false,
        },
      },
      _count: { playerId: true },
      orderBy: { _count: { playerId: 'desc' } },
      take: 25,
    }),
    prisma.matchGoal.groupBy({
      by: ['playerId'],
      where: {
        match: {
          status: 'finished',
          isTest: false,
        },
      },
    }),
  ])

  const playerIds = goalRows.map((row) => row.playerId)
  const players =
    playerIds.length > 0
      ? await prisma.player.findMany({
          where: { id: { in: playerIds } },
          select: {
            id: true,
            name: true,
            position: true,
            team: {
              select: { nameEs: true, iso2: true, flagEmoji: true },
            },
          },
        })
      : []

  const playerById = new Map(players.map((player) => [player.id, player]))

  const topScorers: ScorerWorldCupStats[] = goalRows
    .map((row) => {
      const player = playerById.get(row.playerId)
      if (!player) return null
      return {
        playerId: player.id,
        playerName: player.name,
        position: player.position,
        teamNameEs: player.team.nameEs,
        iso2: player.team.iso2,
        flagEmoji: player.team.flagEmoji,
        goals: row._count.playerId,
      }
    })
    .filter((row): row is ScorerWorldCupStats => row != null)

  const finishedMatchesCount = finishedMatches.length

  return {
    summary: {
      finishedMatches: finishedMatchesCount,
      totalGoals,
      avgGoalsPerMatch:
        finishedMatchesCount > 0
          ? Math.round((totalGoals / finishedMatchesCount) * 100) / 100
          : 0,
      uniqueScorers: uniqueScorerGroups.length,
      teamsWithMatches: teamStats.length,
    },
    topScorers,
    teamsByGoalsScored: [...teamStats].sort(
      (a, b) => b.goalsFor - a.goalsFor || a.nameEs.localeCompare(b.nameEs, 'es')
    ),
    teamsByGoalsConceded: [...teamStats].sort(
      (a, b) =>
        a.goalsAgainst - b.goalsAgainst ||
        b.goalsFor - a.goalsFor ||
        a.nameEs.localeCompare(b.nameEs, 'es')
    ),
    teamsByGoalDifference: [...teamStats].sort(
      (a, b) =>
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.nameEs.localeCompare(b.nameEs, 'es')
    ),
  }
}
