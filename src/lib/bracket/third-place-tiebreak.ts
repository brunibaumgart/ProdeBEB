import type { Standing } from '@/lib/bracket'
import { buildTiebreakMeta } from '@/lib/bracket/fifa-rankings'
import { sortThirdPlaceTeamsByFifa } from '@/lib/bracket/tiebreakers'

/** Orden manual por bucket de puntos: clave = puntos (ej. "4"), valor = teamNames mejor → peor. */
export type ThirdPlaceTiebreakOrder = Record<string, string[]>

export interface ThirdPlaceTiebreakBucket {
  key: string
  points: number
  teams: Standing[]
  /** Grupo (A–L) de cada equipo. */
  teamGroups: Map<string, string>
  relevant: boolean
}

export interface ThirdPlaceCandidate extends Standing {
  group: string
}

export function getThirdPlaceCandidates(
  allStandings: Map<string, Standing[]>,
): ThirdPlaceCandidate[] {
  const candidates: ThirdPlaceCandidate[] = []

  for (const [group, standings] of allStandings.entries()) {
    const third = standings[2]
    if (third) {
      candidates.push({ ...third, group })
    }
  }

  return candidates
}

export function buildThirdPlaceTiebreakBuckets(
  allStandings: Map<string, Standing[]>,
): ThirdPlaceTiebreakBucket[] {
  const candidates = getThirdPlaceCandidates(allStandings)
  const byPoints = new Map<number, ThirdPlaceCandidate[]>()

  for (const candidate of candidates) {
    const list = byPoints.get(candidate.points) ?? []
    list.push(candidate)
    byPoints.set(candidate.points, list)
  }

  const pointValues = [...byPoints.keys()].sort((a, b) => b - a)
  let remaining = 8
  const buckets: ThirdPlaceTiebreakBucket[] = []

  for (const points of pointValues) {
    const teams = byPoints.get(points)!
    const relevant = remaining > 0 && teams.length > 1
    const meta = buildTiebreakMeta(teams.map((team) => team.teamName))
    const sortedTeams = sortThirdPlaceTeamsByFifa(teams, meta)
    const teamGroups = new Map(teams.map((team) => [team.teamName, team.group]))

    buckets.push({
      key: String(points),
      points,
      teams: sortedTeams,
      teamGroups,
      relevant,
    })

    remaining -= teams.length
  }

  return buckets
}

export function getRelevantThirdPlaceTiebreakBuckets(
  allStandings: Map<string, Standing[]>,
): ThirdPlaceTiebreakBucket[] {
  return buildThirdPlaceTiebreakBuckets(allStandings).filter((bucket) => bucket.relevant)
}

function orderTeamsInBucket(
  teams: Standing[],
  manualOrder: string[] | undefined,
  meta: ReturnType<typeof buildTiebreakMeta>,
): Standing[] {
  if (!manualOrder?.length) {
    return sortThirdPlaceTeamsByFifa(teams, meta)
  }

  const byName = new Map(teams.map((team) => [team.teamName, team]))
  const ordered: Standing[] = []

  for (const name of manualOrder) {
    const team = byName.get(name)
    if (team) {
      ordered.push(team)
      byName.delete(name)
    }
  }

  for (const team of byName.values()) {
    ordered.push(team)
  }

  return ordered
}

function buildOrderedThirds(
  allStandings: Map<string, Standing[]>,
  manualOrder: ThirdPlaceTiebreakOrder | null | undefined,
): Standing[] {
  const buckets = buildThirdPlaceTiebreakBuckets(allStandings)
  const meta = buildTiebreakMeta(buckets.flatMap((bucket) => bucket.teams.map((team) => team.teamName)))
  const result: Standing[] = []

  for (const bucket of buckets) {
    const order = manualOrder?.[bucket.key]
    const ordered =
      bucket.relevant && order?.length
        ? orderTeamsInBucket(bucket.teams, order, meta)
        : sortThirdPlaceTeamsByFifa(bucket.teams, meta)
    result.push(...ordered)
  }

  return result
}

export function getAllThirdsWithTiebreak(
  allStandings: Map<string, Standing[]>,
  manualOrder: ThirdPlaceTiebreakOrder | null | undefined,
): Standing[] {
  return buildOrderedThirds(allStandings, manualOrder)
}

export function getBestThirdsWithTiebreak(
  allStandings: Map<string, Standing[]>,
  manualOrder: ThirdPlaceTiebreakOrder | null | undefined,
  count = 8,
): Standing[] {
  return buildOrderedThirds(allStandings, manualOrder).slice(0, count)
}

export function rankAllThirdsWithTiebreak(
  allStandings: Map<string, Standing[]>,
  manualOrder: ThirdPlaceTiebreakOrder | null | undefined,
): Map<string, { rank: number; qualified: boolean }> {
  const ranks = new Map<string, { rank: number; qualified: boolean }>()

  buildOrderedThirds(allStandings, manualOrder).forEach((team, index) => {
    ranks.set(team.teamName, { rank: index + 1, qualified: index < 8 })
  })

  return ranks
}

export function isThirdPlaceTiebreakOrderValid(
  bucket: ThirdPlaceTiebreakBucket,
  order: string[] | undefined,
): boolean {
  if (!order || order.length !== bucket.teams.length) return false
  const names = new Set(bucket.teams.map((team) => team.teamName))
  if (order.some((name) => !names.has(name))) return false
  return new Set(order).size === order.length
}

export function isThirdPlaceTiebreakComplete(
  allStandings: Map<string, Standing[]>,
  manualOrder: ThirdPlaceTiebreakOrder | null | undefined,
): boolean {
  const relevant = getRelevantThirdPlaceTiebreakBuckets(allStandings)
  if (relevant.length === 0) return true
  if (!manualOrder) return false

  return relevant.every((bucket) => isThirdPlaceTiebreakOrderValid(bucket, manualOrder[bucket.key]))
}

export function sanitizeThirdPlaceTiebreakOrder(
  allStandings: Map<string, Standing[]>,
  stored: ThirdPlaceTiebreakOrder | null | undefined,
): ThirdPlaceTiebreakOrder {
  const buckets = buildThirdPlaceTiebreakBuckets(allStandings)
  const result: ThirdPlaceTiebreakOrder = {}

  for (const bucket of buckets) {
    if (!bucket.relevant) continue

    const storedOrder = stored?.[bucket.key]
    if (isThirdPlaceTiebreakOrderValid(bucket, storedOrder)) {
      result[bucket.key] = storedOrder!
      continue
    }

    result[bucket.key] = bucket.teams.map((team) => team.teamName)
  }

  return result
}

export function parseThirdPlaceTiebreakOrder(value: unknown): ThirdPlaceTiebreakOrder | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const result: ThirdPlaceTiebreakOrder = {}
  for (const [key, order] of Object.entries(value)) {
    if (!Array.isArray(order) || !order.every((item) => typeof item === 'string')) continue
    result[key] = order
  }

  return Object.keys(result).length > 0 ? result : null
}
