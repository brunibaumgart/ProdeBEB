import type { Standing } from '@/lib/bracket'
import { getBestThirds } from '@/lib/bracket'
import { isKnockoutPredictionComplete } from '@/lib/bracket/knockout-prediction'
import {
  getQualifiedThirdGroupsFromStandings,
  resolveThirdPlaceByAnnexC,
} from '@/lib/bracket/annex-c'

export interface PredictionScore {
  predHome: number
  predAway: number
  predAdvancesTeamId?: string | null
}

export interface TeamRef {
  id: string
  name: string
  nameEs: string
  iso2: string
  flagEmoji: string
}

export interface KnockoutMatchRef {
  id: number
  homeLabel: string | null
  awayLabel: string | null
}

export interface ResolvedMatchTeams {
  homeTeamId: string | null
  homeTeamName: string | null
  awayTeamId: string | null
  awayTeamName: string | null
}

function buildThirdPlaceByMatchId(
  groupStandings: Map<string, Standing[]>
): Map<number, string> {
  const bestThirds = getBestThirds(groupStandings, 8)
  const qualifiedGroups = getQualifiedThirdGroupsFromStandings(groupStandings, bestThirds)

  if (qualifiedGroups.length !== 8) {
    return new Map()
  }

  return resolveThirdPlaceByAnnexC(qualifiedGroups, groupStandings)
}

function resolveLabelTeamName(
  label: string,
  groupStandings: Map<string, Standing[]>,
  thirdByMatchId: Map<number, string>,
  matchId: number,
  winners: Map<number, string>
): string | null {
  const first = label.match(/^1st Group ([A-L])$/)
  if (first) return groupStandings.get(first[1])?.[0]?.teamName ?? null

  const second = label.match(/^2nd Group ([A-L])$/)
  if (second) return groupStandings.get(second[1])?.[1]?.teamName ?? null

  if (label.startsWith('3rd best')) {
    return thirdByMatchId.get(matchId) ?? null
  }

  const winner = label.match(/^Winner M(\d+)$/)
  if (winner) return winners.get(parseInt(winner[1], 10)) ?? null

  const loser = label.match(/^Loser M(\d+)$/)
  if (loser) {
    const sourceId = parseInt(loser[1], 10)
    const winnerName = winners.get(sourceId)
    if (!winnerName) return null
    // Loser = the other team in that match — resolved externally via full match context
    return `__loser_of_${sourceId}__${winnerName}`
  }

  return null
}

export function getPredictedWinner(
  predHome: number,
  predAway: number,
  homeTeamName: string,
  awayTeamName: string,
  advancesTeamName?: string | null
): string | null {
  if (predHome > predAway) return homeTeamName
  if (predAway > predHome) return awayTeamName
  return advancesTeamName ?? null
}

export function resolvePredictedBracket(
  groupStandings: Map<string, Standing[]>,
  knockoutMatches: KnockoutMatchRef[],
  groupPredictions: Record<number, PredictionScore>,
  knockoutPredictions: Record<number, PredictionScore>,
  teamByName: Map<string, TeamRef>
): Map<number, ResolvedMatchTeams> {
  const thirdByMatchId = buildThirdPlaceByMatchId(groupStandings)
  const winners = new Map<number, string>()
  const resolved = new Map<number, ResolvedMatchTeams>()

  const sorted = [...knockoutMatches].sort((a, b) => a.id - b.id)

  for (const match of sorted) {
    let homeTeamName: string | null = null
    let awayTeamName: string | null = null

    if (match.homeLabel) {
      homeTeamName = resolveLabelTeamName(
        match.homeLabel,
        groupStandings,
        thirdByMatchId,
        match.id,
        winners
      )
    }
    if (match.awayLabel) {
      awayTeamName = resolveLabelTeamName(
        match.awayLabel,
        groupStandings,
        thirdByMatchId,
        match.id,
        winners
      )
    }

    // Resolve loser placeholders using source match teams
    if (homeTeamName?.startsWith('__loser_of_')) {
      const loserMatch = homeTeamName.match(/^__loser_of_(\d+)__(.+)$/)
      if (loserMatch) {
        const sourceId = parseInt(loserMatch[1], 10)
        const winnerName = loserMatch[2]
        const source = resolved.get(sourceId)
        if (source?.homeTeamName && source?.awayTeamName) {
          homeTeamName =
            source.homeTeamName === winnerName ? source.awayTeamName : source.homeTeamName
        } else {
          homeTeamName = null
        }
      } else {
        homeTeamName = null
      }
    }
    if (awayTeamName?.startsWith('__loser_of_')) {
      const loserMatch = awayTeamName.match(/^__loser_of_(\d+)__(.+)$/)
      if (loserMatch) {
        const sourceId = parseInt(loserMatch[1], 10)
        const winnerName = loserMatch[2]
        const source = resolved.get(sourceId)
        if (source?.homeTeamName && source?.awayTeamName) {
          awayTeamName =
            source.homeTeamName === winnerName ? source.awayTeamName : source.homeTeamName
        } else {
          awayTeamName = null
        }
      } else {
        awayTeamName = null
      }
    }

    const homeTeam = homeTeamName ? teamByName.get(homeTeamName) : undefined
    const awayTeam = awayTeamName ? teamByName.get(awayTeamName) : undefined

    resolved.set(match.id, {
      homeTeamId: homeTeam?.id ?? null,
      homeTeamName: homeTeamName ?? null,
      awayTeamId: awayTeam?.id ?? null,
      awayTeamName: awayTeamName ?? null,
    })

    const pred = knockoutPredictions[match.id]
    if (pred && homeTeamName && awayTeamName) {
      const advancesTeamName = pred.predAdvancesTeamId
        ? [...teamByName.values()].find((t) => t.id === pred.predAdvancesTeamId)?.name ?? null
        : null
      const winner = getPredictedWinner(
        pred.predHome,
        pred.predAway,
        homeTeamName,
        awayTeamName,
        advancesTeamName
      )
      if (winner) winners.set(match.id, winner)
    }
  }

  // Group stage winners for any cross-reference
  for (const [matchIdStr, pred] of Object.entries(groupPredictions)) {
    const matchId = parseInt(matchIdStr, 10)
    // group winners not stored by match id in winners map for group stage
    void matchId
    void pred
  }

  return resolved
}

export function countCompleteGroupPredictions(
  groupMatchIds: number[],
  predictions: Record<number, PredictionScore>
): number {
  return groupMatchIds.filter(
    (id) =>
      predictions[id]?.predHome != null &&
      predictions[id]?.predAway != null &&
      predictions[id].predHome >= 0 &&
      predictions[id].predAway >= 0
  ).length
}

export function isKnockoutRoundUnlocked(
  roundMatchIds: number[],
  previousRoundMatchIds: number[],
  predictions: Record<number, PredictionScore>
): boolean {
  if (previousRoundMatchIds.length === 0) return true
  return previousRoundMatchIds.every((id) => {
    const pred = predictions[id]
    if (pred == null) return false
    return isKnockoutPredictionComplete({
      predHome: pred.predHome,
      predAway: pred.predAway,
      advancesTeamId: pred.predAdvancesTeamId,
    })
  })
}
