import type { FixtureMatch, TeamData } from '@/lib/data'
import { buildTiebreakMeta } from '@/lib/bracket/fifa-rankings'
import {
  sortGroupStandingsByFifa,
  sortThirdPlaceTeamsByFifa,
  toFinishedGroupMatches,
} from '@/lib/bracket/tiebreakers'
import type { MatchWithRelations } from '@/lib/queries/matches'

export interface Standing {
  teamName: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  team?: {
    nameEs: string
    iso2: string
    flagEmoji: string
  }
}

interface StandingsMatchInput {
  group?: string | null
  status: string
  homeScore?: number | null
  awayScore?: number | null
  homeName: string
  awayName: string
}

function createEmptyStanding(teamName: string): Standing {
  return {
    teamName,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
  }
}

function computeStandings(
  teams: { name: string; nameEs?: string; iso2?: string; flagEmoji?: string }[],
  matches: StandingsMatchInput[],
  group: string
): Standing[] {
  const standings = new Map<string, Standing>(
    teams.map((team) => [
      team.name,
      {
        ...createEmptyStanding(team.name),
        team: team.nameEs
          ? { nameEs: team.nameEs, iso2: team.iso2!, flagEmoji: team.flagEmoji! }
          : undefined,
      },
    ])
  )

  const finished = matches.filter(
    (match) =>
      match.group === group &&
      match.status === 'finished' &&
      match.homeScore != null &&
      match.awayScore != null
  )

  for (const match of finished) {
    const home = standings.get(match.homeName)
    const away = standings.get(match.awayName)
    if (!home || !away) continue

    const homeScore = match.homeScore!
    const awayScore = match.awayScore!

    home.played += 1
    away.played += 1
    home.goalsFor += homeScore
    home.goalsAgainst += awayScore
    away.goalsFor += awayScore
    away.goalsAgainst += homeScore

    if (homeScore > awayScore) {
      home.won += 1
      home.points += 3
      away.lost += 1
    } else if (homeScore < awayScore) {
      away.won += 1
      away.points += 3
      home.lost += 1
    } else {
      home.drawn += 1
      away.drawn += 1
      home.points += 1
      away.points += 1
    }
  }

  const rawStandings = [...standings.values()].map((standing) => ({
    ...standing,
    goalDiff: standing.goalsFor - standing.goalsAgainst,
  }))

  const teamNames = rawStandings.map((s) => s.teamName)
  const meta = buildTiebreakMeta(teamNames)
  const finishedForTiebreak = toFinishedGroupMatches(
    finished.map((m) => ({
      homeName: m.homeName,
      awayName: m.awayName,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
    }))
  )

  return sortGroupStandingsByFifa(rawStandings, finishedForTiebreak, meta)
}

export function resolveGroupStandings(
  teams: Pick<TeamData, 'name'>[],
  matches: Pick<
    FixtureMatch,
    'home' | 'away' | 'home_score' | 'away_score' | 'status' | 'group'
  >[],
  group: string
): Standing[] {
  return computeStandings(
    teams,
    matches.map((match) => ({
      group: match.group,
      status: match.status,
      homeScore: match.home_score,
      awayScore: match.away_score,
      homeName: match.home,
      awayName: match.away,
    })),
    group
  )
}

export function resolveGroupStandingsFromDb(
  teams: { name: string; nameEs: string; iso2: string; flagEmoji: string }[],
  matches: MatchWithRelations[],
  group: string
): Standing[] {
  return computeStandings(
    teams,
    matches.map((match) => ({
      group: match.group,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homeName: match.homeTeam?.name ?? match.homeLabel ?? '',
      awayName: match.awayTeam?.name ?? match.awayLabel ?? '',
    })),
    group
  )
}

export function getBestThirds(
  allStandings: Map<string, Standing[]>,
  count = 8
): Standing[] {
  const thirds = [...allStandings.entries()]
    .map(([group, standings]) => ({ group, standing: standings[2] }))
    .filter((entry): entry is { group: string; standing: Standing } => Boolean(entry.standing))
    .map((entry) => entry.standing)

  const meta = buildTiebreakMeta(thirds.map((s) => s.teamName))

  return sortThirdPlaceTeamsByFifa(thirds, meta).slice(0, count)
}

export function resolveGroupStandingsFromPredictions(
  teams: { name: string; nameEs: string; iso2: string; flagEmoji: string }[],
  matches: {
    matchId: number
    group?: string | null
    homeName: string
    awayName: string
  }[],
  predictions: Record<number, { predHome: number; predAway: number }>,
  group: string
): Standing[] {
  const predicted: StandingsMatchInput[] = matches
    .filter((match) => match.group === group)
    .flatMap((match) => {
      const pred = predictions[match.matchId]
      if (pred == null) return []
      return [
        {
          group: match.group,
          status: 'finished',
          homeScore: pred.predHome,
          awayScore: pred.predAway,
          homeName: match.homeName,
          awayName: match.awayName,
        },
      ]
    })

  return computeStandings(teams, predicted, group)
}

const POSSIBLE_OUTCOMES = [
  { homeScore: 1, awayScore: 0 },
  { homeScore: 1, awayScore: 1 },
  { homeScore: 0, awayScore: 1 },
] as const

/**
 * Returns standings where only positions that are the same across ALL possible
 * outcomes of remaining matches are included (sparse array).
 * If no matches are pending, returns full standings.
 */
export function resolveClinichedGroupPositions(
  teams: { name: string; nameEs: string; iso2: string; flagEmoji: string }[],
  finishedMatches: MatchWithRelations[],
  pendingMatches: MatchWithRelations[],
  group: string,
): Standing[] {
  const baseInputs: StandingsMatchInput[] = finishedMatches.map((m) => ({
    group: m.group,
    status: m.status,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    homeName: m.homeTeam?.name ?? m.homeLabel ?? '',
    awayName: m.awayTeam?.name ?? m.awayLabel ?? '',
  }))

  const pendingRefs = pendingMatches.map((m) => ({
    group: m.group,
    homeName: m.homeTeam?.name ?? m.homeLabel ?? '',
    awayName: m.awayTeam?.name ?? m.awayLabel ?? '',
  }))

  const allScenarios: Standing[][] = []

  function enumerate(idx: number, extra: StandingsMatchInput[]) {
    if (idx === pendingRefs.length) {
      allScenarios.push(computeStandings(teams, [...baseInputs, ...extra], group))
      return
    }
    const ref = pendingRefs[idx]
    for (const outcome of POSSIBLE_OUTCOMES) {
      enumerate(idx + 1, [
        ...extra,
        {
          group: ref.group,
          status: 'finished',
          homeScore: outcome.homeScore,
          awayScore: outcome.awayScore,
          homeName: ref.homeName,
          awayName: ref.awayName,
        },
      ])
    }
  }

  enumerate(0, [])

  const result: Standing[] = []
  for (let pos = 0; pos < teams.length; pos++) {
    const first = allScenarios[0]?.[pos]
    if (first && allScenarios.every((s) => s[pos]?.teamName === first.teamName)) {
      result[pos] = first
    }
  }
  return result
}

export function resolveBracketSlot(
  label: string,
  groupStandings: Map<string, Standing[]>
): string | null {
  const groupFirst = label.match(/^1st Group ([A-L])$/)
  if (groupFirst) return groupStandings.get(groupFirst[1])?.[0]?.teamName ?? null

  const groupSecond = label.match(/^2nd Group ([A-L])$/)
  if (groupSecond) return groupStandings.get(groupSecond[1])?.[1]?.teamName ?? null

  return null
}
