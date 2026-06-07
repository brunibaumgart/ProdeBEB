import type { Prisma } from '@prisma/client'

import { testTeamVisibilityFilter } from '@/lib/auth/test-access'
import { prisma } from '@/lib/prisma'
import { slugifyTeamName } from '@/lib/teams'
import type { Position } from '@/types'

export type TeamQueryOptions = {
  includeTestContent?: boolean
}

export type TeamWithPlayers = Prisma.TeamGetPayload<{
  include: { players: true }
}>

export async function getAllTeams(
  options: TeamQueryOptions = {}
): Promise<Prisma.TeamGetPayload<object>[]> {
  return prisma.team.findMany({
    where: testTeamVisibilityFilter(options.includeTestContent ?? false),
    orderBy: [{ group: 'asc' }, { nameEs: 'asc' }],
  })
}

export async function getTeamsByConfederation(
  confederation?: string,
  options: TeamQueryOptions = {}
): Promise<Prisma.TeamGetPayload<object>[]> {
  return prisma.team.findMany({
    where: {
      ...testTeamVisibilityFilter(options.includeTestContent ?? false),
      ...(confederation ? { confederation } : {}),
    },
    orderBy: [{ group: 'asc' }, { nameEs: 'asc' }],
  })
}

export async function getTeamsByGroup(
  group: string,
  options: TeamQueryOptions = {}
): Promise<Prisma.TeamGetPayload<object>[]> {
  return prisma.team.findMany({
    where: {
      group,
      ...testTeamVisibilityFilter(options.includeTestContent ?? false),
    },
    orderBy: { nameEs: 'asc' },
  })
}

export async function getTeamBySlug(
  slug: string,
  options: TeamQueryOptions = {}
): Promise<TeamWithPlayers | null> {
  const teams = await prisma.team.findMany({
    where: testTeamVisibilityFilter(options.includeTestContent ?? false),
    include: {
      players: { orderBy: [{ position: 'asc' }, { name: 'asc' }] },
    },
  })

  return teams.find((team) => slugifyTeamName(team.name) === slug) ?? null
}

export async function getTeamSelectOptions(
  options: TeamQueryOptions = {}
): Promise<{ id: string; name: string; nameEs: string }[]> {
  return prisma.team.findMany({
    where: testTeamVisibilityFilter(options.includeTestContent ?? false),
    select: { id: true, name: true, nameEs: true },
    orderBy: { nameEs: 'asc' },
  })
}

const POSITION_ORDER: Position[] = ['Portero', 'Defensa', 'Mediocampista', 'Delantero']

export function groupPlayersByPosition(players: TeamWithPlayers['players']) {
  return POSITION_ORDER.map((position) => ({
    position,
    players: players.filter((player) => player.position === position),
  })).filter((group) => group.players.length > 0)
}

export async function getPlayersByTeamIds(teamIds: string[]) {
  if (teamIds.length === 0) return []

  return prisma.player.findMany({
    where: { teamId: { in: teamIds } },
    select: {
      id: true,
      name: true,
      position: true,
      teamId: true,
    },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  })
}

export type PlayerOption = Awaited<ReturnType<typeof getPlayersByTeamIds>>[number]

export async function getDistinctGroups(options: TeamQueryOptions = {}): Promise<string[]> {
  const teams = await prisma.team.findMany({
    where: testTeamVisibilityFilter(options.includeTestContent ?? false),
    select: { group: true },
    distinct: ['group'],
    orderBy: { group: 'asc' },
  })
  return teams.map((team) => team.group)
}

export async function getOfficialTeamSlugs(): Promise<string[]> {
  const teams = await getAllTeams({ includeTestContent: false })
  return teams.map((team) => slugifyTeamName(team.name))
}
