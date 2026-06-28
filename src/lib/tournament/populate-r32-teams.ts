import { resolveGroupStandingsFromDb } from '@/lib/bracket'
import { resolvePredictedBracket } from '@/lib/bracket/predicted-bracket'
import { getGroupStageMatches, getKnockoutMatches } from '@/lib/queries/matches'
import { getAllTeams } from '@/lib/queries/teams'
import { prisma } from '@/lib/prisma'

const GROUPS = 'ABCDEFGHIJKL'.split('')

/**
 * Reads actual group standings from DB and writes homeTeamId/awayTeamId into
 * every R32 match whose teams are now determined.  Safe to call multiple times.
 */
export async function populateR32TeamsFromGroupStandings(): Promise<number> {
  const [allTeams, groupMatches, knockoutMatches] = await Promise.all([
    getAllTeams(),
    getGroupStageMatches(),
    getKnockoutMatches(),
  ])

  const groupStandings = new Map<string, ReturnType<typeof resolveGroupStandingsFromDb>>()
  for (const group of GROUPS) {
    const gTeams = allTeams.filter((t) => t.group === group)
    const gMatches = groupMatches.filter((m) => m.group === group)
    groupStandings.set(group, resolveGroupStandingsFromDb(gTeams, gMatches, group))
  }

  const teamByName = new Map(
    allTeams.map((t) => ({
      id: t.id,
      name: t.name,
      nameEs: t.nameEs,
      iso2: t.iso2,
      flagEmoji: t.flagEmoji,
    })).map((t) => [t.name, t]),
  )

  const resolved = resolvePredictedBracket(
    groupStandings,
    knockoutMatches.map((m) => ({ id: m.id, homeLabel: m.homeLabel, awayLabel: m.awayLabel })),
    {},
    {},
    teamByName,
    null,
  )

  const r32MatchIds = new Set(
    knockoutMatches.filter((m) => m.round === 'Round of 32').map((m) => m.id),
  )

  let updated = 0
  for (const [matchId, teams] of resolved) {
    if (!r32MatchIds.has(matchId)) continue
    if (!teams.homeTeamId && !teams.awayTeamId) continue

    await prisma.match.update({
      where: { id: matchId },
      data: {
        ...(teams.homeTeamId ? { homeTeamId: teams.homeTeamId } : {}),
        ...(teams.awayTeamId ? { awayTeamId: teams.awayTeamId } : {}),
      },
    })
    updated++
  }

  return updated
}
