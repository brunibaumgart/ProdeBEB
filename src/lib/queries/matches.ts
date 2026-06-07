import type { Prisma } from '@prisma/client'

import { testMatchVisibilityFilter } from '@/lib/auth/test-access'
import { prisma } from '@/lib/prisma'
import type { MatchRound } from '@/types'

export const matchWithRelations = {
  homeTeam: true,
  awayTeam: true,
  venue: true,
} satisfies Prisma.MatchInclude

export type MatchWithRelations = Prisma.MatchGetPayload<{
  include: typeof matchWithRelations
}>

export interface MatchFilters {
  group?: string
  round?: MatchRound
  teamId?: string
}

export interface MatchQueryOptions {
  includeTestMatches?: boolean
}

export function buildMatchWhere(
  filters: MatchFilters,
  options: MatchQueryOptions = {}
): Prisma.MatchWhereInput {
  const where: Prisma.MatchWhereInput = {
    ...testMatchVisibilityFilter(options.includeTestMatches ?? false),
  }

  if (filters.group) where.group = filters.group
  if (filters.round) where.round = filters.round
  if (filters.teamId) {
    where.OR = [{ homeTeamId: filters.teamId }, { awayTeamId: filters.teamId }]
  }

  return where
}

export async function getMatches(
  filters: MatchFilters = {},
  options: MatchQueryOptions = {}
): Promise<MatchWithRelations[]> {
  return prisma.match.findMany({
    where: buildMatchWhere(filters, options),
    include: matchWithRelations,
    orderBy: [{ date: 'asc' }, { id: 'asc' }],
  })
}

export async function getMatchById(
  id: number,
  options: MatchQueryOptions = {}
): Promise<MatchWithRelations | null> {
  return prisma.match.findFirst({
    where: {
      id,
      ...testMatchVisibilityFilter(options.includeTestMatches ?? false),
    },
    include: matchWithRelations,
  })
}

export async function getTodayMatches(
  gte: Date,
  lte: Date,
  options: MatchQueryOptions = {}
): Promise<MatchWithRelations[]> {
  return prisma.match.findMany({
    where: {
      date: { gte, lte },
      ...testMatchVisibilityFilter(options.includeTestMatches ?? false),
    },
    include: matchWithRelations,
    orderBy: { date: 'asc' },
  })
}

export async function getUpcomingMatches(
  limit = 3,
  options: MatchQueryOptions = {}
): Promise<MatchWithRelations[]> {
  return prisma.match.findMany({
    where: {
      status: 'scheduled',
      date: { gte: new Date() },
      ...testMatchVisibilityFilter(options.includeTestMatches ?? false),
    },
    include: matchWithRelations,
    orderBy: { date: 'asc' },
    take: limit,
  })
}

export async function getNextMatch(
  options: MatchQueryOptions = {}
): Promise<MatchWithRelations | null> {
  return prisma.match.findFirst({
    where: {
      status: 'scheduled',
      date: { gte: new Date() },
      ...testMatchVisibilityFilter(options.includeTestMatches ?? false),
    },
    include: matchWithRelations,
    orderBy: { date: 'asc' },
  })
}

export async function getRecentFinishedMatches(
  limit = 3,
  options: MatchQueryOptions = {}
): Promise<MatchWithRelations[]> {
  return prisma.match.findMany({
    where: {
      status: 'finished',
      ...testMatchVisibilityFilter(options.includeTestMatches ?? false),
    },
    include: matchWithRelations,
    orderBy: { date: 'desc' },
    take: limit,
  })
}

export async function getTeamMatches(
  teamId: string,
  options: MatchQueryOptions = {}
): Promise<MatchWithRelations[]> {
  return prisma.match.findMany({
    where: {
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      ...testMatchVisibilityFilter(options.includeTestMatches ?? false),
    },
    include: matchWithRelations,
    orderBy: { date: 'asc' },
  })
}

export async function getGroupStageMatches(
  options: MatchQueryOptions = {}
): Promise<MatchWithRelations[]> {
  return prisma.match.findMany({
    where: {
      round: 'Group Stage',
      ...testMatchVisibilityFilter(options.includeTestMatches ?? false),
    },
    include: matchWithRelations,
    orderBy: { date: 'asc' },
  })
}

export async function getKnockoutMatches(
  options: MatchQueryOptions = {}
): Promise<MatchWithRelations[]> {
  return prisma.match.findMany({
    where: {
      round: { not: 'Group Stage' },
      ...testMatchVisibilityFilter(options.includeTestMatches ?? false),
    },
    include: matchWithRelations,
    orderBy: { id: 'asc' },
  })
}

export function groupMatchesByDay(matches: MatchWithRelations[]): Map<string, MatchWithRelations[]> {
  const grouped = new Map<string, MatchWithRelations[]>()

  for (const match of matches) {
    const dayKey = match.date.toLocaleDateString('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
    })
    const existing = grouped.get(dayKey) ?? []
    existing.push(match)
    grouped.set(dayKey, existing)
  }

  return grouped
}

export async function getOfficialMatchIds(): Promise<number[]> {
  const matches = await prisma.match.findMany({
    where: testMatchVisibilityFilter(false),
    select: { id: true },
    orderBy: { id: 'asc' },
  })
  return matches.map((match) => match.id)
}
