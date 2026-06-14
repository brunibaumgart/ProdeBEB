export type LeaderboardPointsField =
  | 'pointsTotal'
  | 'pointsMatchday'
  | 'pointsScorers'
  | 'pointsComplete'

export interface LeaderboardMemberPoints {
  joinedAt: Date
  pointsMatchday: number
  pointsScorers: number
  pointsComplete: number
  pointsTotal: number
}

export interface LeaderboardFilterOption {
  key: string
  label: string
  field: LeaderboardPointsField
  columnLabel: string
  disabled?: boolean
  minScorerPoints?: number
}

export function buildLeaderboardFilters({
  modeMatchday,
  modeScorers,
  modeComplete,
}: {
  modeMatchday: boolean
  modeScorers: boolean
  modeComplete: boolean
}): LeaderboardFilterOption[] {
  const activeModesCount = [modeMatchday, modeScorers, modeComplete].filter(Boolean).length
  const options: LeaderboardFilterOption[] = []

  if (modeMatchday) {
    options.push({
      key: 'matchday',
      label: 'Fecha a Fecha',
      field: 'pointsMatchday',
      columnLabel: 'F a F',
    })
  }

  if (modeScorers) {
    options.push({
      key: 'scorers',
      label: 'Goleadores',
      field: 'pointsScorers',
      columnLabel: 'Goleadores',
      minScorerPoints: 1,
    })
  }

  if (modeComplete) {
    options.push({
      key: 'complete',
      label: 'Completo',
      field: 'pointsComplete',
      columnLabel: 'Completo',
      disabled: true,
    })
  }

  if (activeModesCount > 1) {
    options.push({
      key: 'total',
      label: 'Total',
      field: 'pointsTotal',
      columnLabel: 'Total',
      minScorerPoints: modeScorers ? 1 : undefined,
    })
  }

  return options
}

export function getDefaultLeaderboardFilterKey(
  filters: LeaderboardFilterOption[],
): string {
  return filters.find((option) => !option.disabled)?.key ?? filters[0]?.key ?? 'total'
}

export function sortLeaderboardMembers<T extends LeaderboardMemberPoints>(
  members: T[],
  pointsField: LeaderboardPointsField,
  minScorerPoints?: number,
): T[] {
  const filtered =
    minScorerPoints != null
      ? members.filter((member) => member.pointsScorers >= minScorerPoints)
      : members

  return [...filtered].sort((a, b) => {
    const diff = b[pointsField] - a[pointsField]
    if (diff !== 0) return diff
    return a.joinedAt.getTime() - b.joinedAt.getTime()
  })
}
