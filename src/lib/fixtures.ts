import { getFixtureData, type FixtureMatch } from '@/lib/data'
import type { MatchRound } from '@/types'

export function getAllMatches(): FixtureMatch[] {
  return getFixtureData().matches
}

export function getMatchById(id: number): FixtureMatch | undefined {
  return getAllMatches().find((match) => match.id === id)
}

export function getMatchesByDate(date: string): FixtureMatch[] {
  return getAllMatches().filter((match) => match.date === date)
}

export function getMatchesByGroup(group: string): FixtureMatch[] {
  return getAllMatches().filter((match) => match.group === group)
}

export function getMatchesByRound(round: MatchRound): FixtureMatch[] {
  return getAllMatches().filter((match) => match.round === round)
}

export function getMatchesByTeam(teamName: string): FixtureMatch[] {
  return getAllMatches().filter(
    (match) => match.home === teamName || match.away === teamName
  )
}

export function getUpcomingMatches(limit = 3): FixtureMatch[] {
  const now = Date.now()
  return getAllMatches()
    .filter((match) => match.status === 'scheduled')
    .filter((match) => {
      const [year, month, day] = match.date.split('-').map(Number)
      const [hours, minutes] = match.time_arg.split(':').map(Number)
      const kickoff = Date.UTC(year, month - 1, day, hours + 3, minutes)
      return kickoff >= now
    })
    .slice(0, limit)
}

export function groupMatchesByDate(matches: FixtureMatch[]): Map<string, FixtureMatch[]> {
  const grouped = new Map<string, FixtureMatch[]>()
  for (const match of matches) {
    const existing = grouped.get(match.date) ?? []
    existing.push(match)
    grouped.set(match.date, existing)
  }
  return grouped
}
