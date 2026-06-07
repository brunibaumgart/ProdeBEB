import annexCData from '../../../data/annex_c_third_place.json'

import type { Standing } from '@/lib/bracket'

export type RoundOf32Slot = '1A' | '1B' | '1D' | '1E' | '1G' | '1I' | '1K' | '1L'

const SLOT_ORDER: RoundOf32Slot[] = ['1A', '1B', '1D', '1E', '1G', '1I', '1K', '1L']

const slotToMatchId = annexCData.slotToMatchId as Record<RoundOf32Slot, number>

const combinations = annexCData.combinations as Record<
  string,
  Record<RoundOf32Slot, string>
>

/** Clave canónica: 8 grupos clasificados ordenados alfabéticamente. */
export function getThirdPlaceCombinationKey(qualifiedGroups: string[]): string {
  return [...qualifiedGroups].sort().join('')
}

export function getAnnexCMapping(qualifiedGroups: string[]): Record<RoundOf32Slot, string> | null {
  const key = getThirdPlaceCombinationKey(qualifiedGroups)
  return combinations[key] ?? null
}

/**
 * Resuelve qué tercero va a cada partido R32 según Anexo C FIFA.
 * @returns Map matchId → teamName del tercero clasificado
 */
export function resolveThirdPlaceByAnnexC(
  qualifiedThirdGroups: string[],
  groupStandings: Map<string, Standing[]>
): Map<number, string> {
  const mapping = getAnnexCMapping(qualifiedThirdGroups)
  const result = new Map<number, string>()

  if (!mapping) return result

  for (const slot of SLOT_ORDER) {
    const thirdLabel = mapping[slot] // e.g. "3E"
    const group = thirdLabel.replace('3', '')
    const teamName = groupStandings.get(group)?.[2]?.teamName
    const matchId = slotToMatchId[slot]

    if (teamName && matchId) {
      result.set(matchId, teamName)
    }
  }

  return result
}

export function getQualifiedThirdGroupsFromStandings(
  groupStandings: Map<string, Standing[]>,
  bestThirds: Standing[]
): string[] {
  const qualifiedNames = new Set(bestThirds.map((s) => s.teamName))

  return [...groupStandings.entries()]
    .filter(([, standings]) => {
      const third = standings[2]
      return third && qualifiedNames.has(third.teamName)
    })
    .map(([group]) => group)
    .sort()
}

export { slotToMatchId as ANNEX_C_SLOT_TO_MATCH_ID }
