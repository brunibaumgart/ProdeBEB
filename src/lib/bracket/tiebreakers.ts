import type { Standing } from '@/lib/bracket'
import type { TeamTiebreakMeta } from '@/lib/bracket/fifa-rankings'

export interface FinishedGroupMatch {
  homeName: string
  awayName: string
  homeScore: number
  awayScore: number
}

interface MiniStats {
  points: number
  goalDiff: number
  goalsFor: number
}

function compareMiniStats(a: MiniStats, b: MiniStats): number {
  if (b.points !== a.points) return b.points - a.points
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
  return 0
}

function miniStatsEqual(a: MiniStats, b: MiniStats): boolean {
  return a.points === b.points && a.goalDiff === b.goalDiff && a.goalsFor === b.goalsFor
}

function computeMiniLeague(
  teamNames: string[],
  matches: FinishedGroupMatch[]
): Map<string, MiniStats> {
  const names = new Set(teamNames)
  const stats = new Map<string, MiniStats>(
    teamNames.map((name) => [name, { points: 0, goalDiff: 0, goalsFor: 0 }])
  )

  for (const match of matches) {
    if (!names.has(match.homeName) || !names.has(match.awayName)) continue

    const home = stats.get(match.homeName)!
    const away = stats.get(match.awayName)!

    home.goalsFor += match.homeScore
    home.goalDiff += match.homeScore - match.awayScore
    away.goalsFor += match.awayScore
    away.goalDiff += match.awayScore - match.homeScore

    if (match.homeScore > match.awayScore) {
      home.points += 3
    } else if (match.homeScore < match.awayScore) {
      away.points += 3
    } else {
      home.points += 1
      away.points += 1
    }
  }

  return stats
}

function compareByStep2(
  a: Standing,
  b: Standing,
  meta: Map<string, TeamTiebreakMeta>
): number {
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor

  const fpA = meta.get(a.teamName)?.fairPlayScore ?? 0
  const fpB = meta.get(b.teamName)?.fairPlayScore ?? 0
  if (fpB !== fpA) return fpB - fpA

  const rankA = meta.get(a.teamName)?.fifaRanking ?? 9999
  const rankB = meta.get(b.teamName)?.fifaRanking ?? 9999
  return rankA - rankB
}

/** Paso 2 + 3 FIFA: dif. general, goles, fair play, ranking. */
function rankByStep2(
  tied: Standing[],
  meta: Map<string, TeamTiebreakMeta>
): Standing[] {
  return [...tied].sort((a, b) => compareByStep2(a, b, meta))
}

/**
 * Paso 1 FIFA: mini-torneo entre empatados (pts → dif → gf en partidos entre ellos).
 * Si persiste el empate, se repite el paso 1; si no alcanza, paso 2.
 */
function rankTiedTeamsFifa(
  tied: Standing[],
  finishedMatches: FinishedGroupMatch[],
  meta: Map<string, TeamTiebreakMeta>
): Standing[] {
  if (tied.length <= 1) return tied

  const names = new Set(tied.map((t) => t.teamName))
  const h2hMatches = finishedMatches.filter(
    (m) => names.has(m.homeName) && names.has(m.awayName)
  )

  const h2hStats = computeMiniLeague([...names], h2hMatches)

  const sortedByH2H = [...tied].sort((a, b) =>
    compareMiniStats(h2hStats.get(a.teamName)!, h2hStats.get(b.teamName)!)
  )

  const groups: Standing[][] = []
  for (const team of sortedByH2H) {
    const last = groups[groups.length - 1]
    if (!last) {
      groups.push([team])
      continue
    }
    const refStats = h2hStats.get(last[0].teamName)!
    const teamStats = h2hStats.get(team.teamName)!
    if (miniStatsEqual(refStats, teamStats)) {
      last.push(team)
    } else {
      groups.push([team])
    }
  }

  return groups.flatMap((group) => {
    if (group.length === 1) return group

    const allSameH2H = group.every((t) =>
      miniStatsEqual(h2hStats.get(group[0].teamName)!, h2hStats.get(t.teamName)!)
    )

    if (allSameH2H) {
      return rankByStep2(group, meta)
    }

    return rankTiedTeamsFifa(group, finishedMatches, meta)
  })
}

/** Ordena una tabla de grupo según criterios FIFA 2026. */
export function sortGroupStandingsByFifa(
  standings: Standing[],
  finishedMatches: FinishedGroupMatch[],
  meta: Map<string, TeamTiebreakMeta>
): Standing[] {
  const byPoints = new Map<number, Standing[]>()
  for (const standing of standings) {
    const group = byPoints.get(standing.points) ?? []
    group.push(standing)
    byPoints.set(standing.points, group)
  }

  const pointValues = [...byPoints.keys()].sort((a, b) => b - a)
  const result: Standing[] = []

  for (const pts of pointValues) {
    const tied = byPoints.get(pts)!
    result.push(...rankTiedTeamsFifa(tied, finishedMatches, meta))
  }

  return result
}

/** Mejores terceros — criterios FIFA (sin head-to-head entre grupos). */
export function sortThirdPlaceTeamsByFifa(
  thirds: Standing[],
  meta: Map<string, TeamTiebreakMeta>
): Standing[] {
  return [...thirds].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    return compareByStep2(a, b, meta)
  })
}

export function toFinishedGroupMatches(
  matches: {
    homeName: string
    awayName: string
    homeScore?: number | null
    awayScore?: number | null
    status: string
  }[]
): FinishedGroupMatch[] {
  return matches
    .filter(
      (m) =>
        m.status === 'finished' && m.homeScore != null && m.awayScore != null
    )
    .map((m) => ({
      homeName: m.homeName,
      awayName: m.awayName,
      homeScore: m.homeScore!,
      awayScore: m.awayScore!,
    }))
}
