import type { Standing } from '@/lib/bracket'
import {
  getBestThirdsWithTiebreak,
  type ThirdPlaceTiebreakOrder,
} from '@/lib/bracket/third-place-tiebreak'
import {
  ANNEX_C_SLOT_TO_MATCH_ID,
  getAnnexCMapping,
  getQualifiedThirdGroupsFromStandings,
  resolveThirdPlaceByAnnexC,
  type RoundOf32Slot,
} from '@/lib/bracket/annex-c'

export type R32OpponentStatus = 'qualified' | 'not_qualified' | 'eliminated' | 'pending'

export type R32OpponentProjection = {
  status: R32OpponentStatus
  provisional?: boolean
  matchId?: number
  matchLabel?: string
  opponentName?: string
  opponentDisplay?: string
  opponentTeam?: Standing['team']
  isHome?: boolean
  note?: string
}

type OpponentRef =
  | { kind: 'second'; group: string }
  | { kind: 'first'; group: string }
  | { kind: 'third_annex'; slot: RoundOf32Slot }

type PlacementRule = {
  matchId: number
  role: 'home' | 'away'
  opponent: OpponentRef
}

const FIRST_PLACE_R32: Record<string, PlacementRule> = {
  A: { matchId: 79, role: 'home', opponent: { kind: 'third_annex', slot: '1A' } },
  B: { matchId: 85, role: 'home', opponent: { kind: 'third_annex', slot: '1B' } },
  C: { matchId: 76, role: 'home', opponent: { kind: 'second', group: 'F' } },
  D: { matchId: 81, role: 'home', opponent: { kind: 'third_annex', slot: '1D' } },
  E: { matchId: 74, role: 'home', opponent: { kind: 'third_annex', slot: '1E' } },
  F: { matchId: 75, role: 'home', opponent: { kind: 'second', group: 'C' } },
  G: { matchId: 82, role: 'home', opponent: { kind: 'third_annex', slot: '1G' } },
  H: { matchId: 84, role: 'home', opponent: { kind: 'second', group: 'J' } },
  I: { matchId: 77, role: 'home', opponent: { kind: 'third_annex', slot: '1I' } },
  J: { matchId: 86, role: 'home', opponent: { kind: 'second', group: 'H' } },
  K: { matchId: 87, role: 'home', opponent: { kind: 'third_annex', slot: '1K' } },
  L: { matchId: 80, role: 'home', opponent: { kind: 'third_annex', slot: '1L' } },
}

const SECOND_PLACE_R32: Record<string, PlacementRule> = {
  A: { matchId: 73, role: 'home', opponent: { kind: 'second', group: 'B' } },
  B: { matchId: 73, role: 'away', opponent: { kind: 'second', group: 'A' } },
  C: { matchId: 75, role: 'away', opponent: { kind: 'first', group: 'F' } },
  D: { matchId: 88, role: 'home', opponent: { kind: 'second', group: 'G' } },
  E: { matchId: 78, role: 'home', opponent: { kind: 'second', group: 'I' } },
  F: { matchId: 76, role: 'away', opponent: { kind: 'first', group: 'C' } },
  G: { matchId: 88, role: 'away', opponent: { kind: 'second', group: 'D' } },
  H: { matchId: 86, role: 'away', opponent: { kind: 'first', group: 'J' } },
  I: { matchId: 78, role: 'away', opponent: { kind: 'second', group: 'E' } },
  J: { matchId: 84, role: 'away', opponent: { kind: 'first', group: 'H' } },
  K: { matchId: 83, role: 'home', opponent: { kind: 'second', group: 'L' } },
  L: { matchId: 83, role: 'away', opponent: { kind: 'second', group: 'K' } },
}

const R32_HOME_FIRST_GROUP: Record<number, string> = {
  74: 'E',
  77: 'I',
  79: 'A',
  80: 'L',
  81: 'D',
  82: 'G',
  85: 'B',
  87: 'K',
}

/** Grupos posibles del tercero en cada slot del Anexo C (docs/REGLAS-PASAJES.md). */
const ANNEX_SLOT_CANDIDATE_GROUPS: Record<RoundOf32Slot, string[]> = {
  '1E': ['A', 'B', 'C', 'D', 'F'],
  '1I': ['C', 'D', 'F', 'G', 'H'],
  '1A': ['C', 'E', 'F', 'H', 'I'],
  '1L': ['E', 'H', 'I', 'J', 'K'],
  '1D': ['B', 'E', 'F', 'I', 'J'],
  '1G': ['A', 'E', 'H', 'I', 'J'],
  '1B': ['E', 'F', 'G', 'I', 'J'],
  '1K': ['D', 'E', 'I', 'J', 'L'],
}

function getStandingAt(
  groupStandings: Map<string, Standing[]>,
  group: string,
  position: 0 | 1 | 2,
): Standing | undefined {
  return groupStandings.get(group)?.[position]
}

function teamDisplayName(standing: Standing | undefined): string | undefined {
  return standing?.team?.nameEs ?? standing?.teamName
}

function buildAnnexContext(
  groupStandings: Map<string, Standing[]>,
  thirdPlaceTiebreakOrder?: ThirdPlaceTiebreakOrder | null,
) {
  const bestThirds = getBestThirdsWithTiebreak(groupStandings, thirdPlaceTiebreakOrder, 8)
  const qualifiedGroups = getQualifiedThirdGroupsFromStandings(groupStandings, bestThirds)
  const annexMapping =
    qualifiedGroups.length === 8 ? getAnnexCMapping(qualifiedGroups) : null
  const thirdByMatchId =
    qualifiedGroups.length === 8 && annexMapping
      ? resolveThirdPlaceByAnnexC(qualifiedGroups, groupStandings)
      : new Map<number, string>()

  return {
    bestThirds,
    annexMapping,
    thirdByMatchId,
    bestThirdNames: new Set(bestThirds.map((standing) => standing.teamName)),
    annexResolved: annexMapping != null,
  }
}

function resolveOpponentFromRef(
  ref: OpponentRef,
  groupStandings: Map<string, Standing[]>,
  annexMapping: Record<RoundOf32Slot, string> | null,
  bestThirds: Standing[],
): Standing | undefined {
  if (ref.kind === 'first') {
    return getStandingAt(groupStandings, ref.group, 0)
  }
  if (ref.kind === 'second') {
    return getStandingAt(groupStandings, ref.group, 1)
  }
  if (annexMapping) {
    const thirdLabel = annexMapping[ref.slot]
    const sourceGroup = thirdLabel.replace('3', '')
    return getStandingAt(groupStandings, sourceGroup, 2)
  }

  return resolveProvisionalThirdForSlot(ref.slot, groupStandings, bestThirds)
}

function resolveProvisionalThirdForSlot(
  slot: RoundOf32Slot,
  groupStandings: Map<string, Standing[]>,
  bestThirds: Standing[],
): Standing | undefined {
  const candidates = ANNEX_SLOT_CANDIDATE_GROUPS[slot]
  const bestThirdRank = new Map(bestThirds.map((standing, index) => [standing.teamName, index]))

  let bestStanding: Standing | undefined
  let bestRank = Number.POSITIVE_INFINITY

  for (const candidateGroup of candidates) {
    const third = getStandingAt(groupStandings, candidateGroup, 2)
    if (!third) continue

    const rank = bestThirdRank.get(third.teamName)
    if (rank != null && rank < bestRank) {
      bestRank = rank
      bestStanding = third
    }
  }

  return bestStanding
}

function findProvisionalThirdMatchId(
  teamName: string,
  groupStandings: Map<string, Standing[]>,
  bestThirds: Standing[],
): number | undefined {
  for (const slot of Object.keys(ANNEX_SLOT_CANDIDATE_GROUPS) as RoundOf32Slot[]) {
    const provisionalThird = resolveProvisionalThirdForSlot(slot, groupStandings, bestThirds)
    if (provisionalThird?.teamName === teamName) {
      return ANNEX_C_SLOT_TO_MATCH_ID[slot]
    }
  }

  return undefined
}

function qualifiedProjection(
  rule: PlacementRule,
  opponent: Standing | undefined,
  provisional: boolean,
): R32OpponentProjection {
  const opponentDisplay = teamDisplayName(opponent)

  if (!opponentDisplay) {
    return {
      status: 'pending',
      provisional,
      matchId: rule.matchId,
      matchLabel: `M${rule.matchId}`,
      isHome: rule.role === 'home',
      note: 'Rival aún sin definir en la tabla',
    }
  }

  return {
    status: 'qualified',
    provisional,
    matchId: rule.matchId,
    matchLabel: `M${rule.matchId}`,
    opponentName: opponent?.teamName,
    opponentDisplay,
    opponentTeam: opponent?.team,
    isHome: rule.role === 'home',
    note: `vs ${opponentDisplay}`,
  }
}

export function resolveGroupR32Opponents(
  group: string,
  standings: Standing[],
  groupStandings: Map<string, Standing[]>,
  allGroupsComplete: boolean,
  thirdPlaceTiebreakOrder?: ThirdPlaceTiebreakOrder | null,
): R32OpponentProjection[] {
  const { bestThirds, annexMapping, thirdByMatchId, bestThirdNames, annexResolved } =
    buildAnnexContext(groupStandings, thirdPlaceTiebreakOrder)
  const provisional = !allGroupsComplete || !annexResolved

  return standings.map((standing, index) => {
    if (index === 3) {
      return { status: 'eliminated', note: 'Eliminado' }
    }

    if (index === 2) {
      if (!bestThirdNames.has(standing.teamName)) {
        return {
          status: 'not_qualified',
          provisional,
          note: 'Fuera de los 8 mejores terceros por ahora',
        }
      }

      let matchId: number | undefined
      for (const [mid, teamName] of thirdByMatchId.entries()) {
        if (teamName === standing.teamName) {
          matchId = mid
          break
        }
      }

      if (!matchId) {
        matchId = findProvisionalThirdMatchId(standing.teamName, groupStandings, bestThirds)
      }

      const homeGroup = matchId ? R32_HOME_FIRST_GROUP[matchId] : undefined
      const opponent = homeGroup ? getStandingAt(groupStandings, homeGroup, 0) : undefined
      const opponentDisplay = teamDisplayName(opponent)

      if (!matchId || !opponentDisplay) {
        return {
          status: 'pending',
          provisional,
          note: 'Rival aún sin definir en la tabla',
        }
      }

      return {
        status: 'qualified',
        provisional,
        matchId,
        matchLabel: `M${matchId}`,
        opponentName: opponent?.teamName,
        opponentDisplay,
        opponentTeam: opponent?.team,
        isHome: false,
        note: `vs ${opponentDisplay}`,
      }
    }

    const rule = index === 0 ? FIRST_PLACE_R32[group] : SECOND_PLACE_R32[group]
    if (!rule) {
      return { status: 'pending', provisional, note: 'Sin cruce definido' }
    }

    const opponent = resolveOpponentFromRef(rule.opponent, groupStandings, annexMapping, bestThirds)
    return qualifiedProjection(rule, opponent, provisional)
  })
}
