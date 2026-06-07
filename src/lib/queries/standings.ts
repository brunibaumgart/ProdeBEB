import { unstable_cache } from 'next/cache'

import { resolveGroupStandingsFromDb } from '@/lib/bracket'
import { getGroupStageMatches } from '@/lib/queries/matches'
import { getDistinctGroups, getTeamsByGroup } from '@/lib/queries/teams'

export type GroupStandingsTable = {
  group: string
  standings: ReturnType<typeof resolveGroupStandingsFromDb>
}

async function fetchGroupStandingsTables(): Promise<GroupStandingsTable[]> {
  const [groups, groupMatches] = await Promise.all([getDistinctGroups(), getGroupStageMatches()])

  return Promise.all(
    groups.map(async (group) => {
      const teams = await getTeamsByGroup(group)
      return {
        group,
        standings: resolveGroupStandingsFromDb(teams, groupMatches, group),
      }
    }),
  )
}

export const getCachedGroupStandings = unstable_cache(
  fetchGroupStandingsTables,
  ['group-standings'],
  { revalidate: 60, tags: ['standings'] },
)
