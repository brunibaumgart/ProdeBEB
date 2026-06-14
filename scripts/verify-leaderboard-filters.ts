/**
 * Verifica orden y filtros de la tabla de posiciones por modalidad.
 * Ejecutar: npx tsx scripts/verify-leaderboard-filters.ts
 */
import {
  buildLeaderboardFilters,
  getDefaultLeaderboardFilterKey,
  sortLeaderboardMembers,
} from '../src/lib/tournament/leaderboard-filters'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

const members = [
  {
    joinedAt: new Date('2026-06-01T12:00:00Z'),
    pointsMatchday: 10,
    pointsScorers: 0,
    pointsComplete: 5,
    pointsTotal: 15,
  },
  {
    joinedAt: new Date('2026-06-02T12:00:00Z'),
    pointsMatchday: 8,
    pointsScorers: 3,
    pointsComplete: 2,
    pointsTotal: 13,
  },
  {
    joinedAt: new Date('2026-06-03T12:00:00Z'),
    pointsMatchday: 12,
    pointsScorers: 5,
    pointsComplete: 0,
    pointsTotal: 17,
  },
]

const filters = buildLeaderboardFilters({
  modeMatchday: true,
  modeScorers: true,
  modeComplete: true,
})

assert(
  filters.map((filter) => filter.key).join(',') === 'matchday,scorers,complete,total',
  'filter order',
)
assert(filters.find((filter) => filter.key === 'complete')?.disabled === true, 'complete disabled')
assert(getDefaultLeaderboardFilterKey(filters) === 'matchday', 'default matchday')

const scorersFilter = filters.find((filter) => filter.key === 'scorers')!
const totalFilter = filters.find((filter) => filter.key === 'total')!

assert(
  sortLeaderboardMembers(members, scorersFilter.field, scorersFilter.minScorerPoints).length === 2,
  'scorers hides zero points',
)
assert(
  sortLeaderboardMembers(members, totalFilter.field, totalFilter.minScorerPoints).length === 2,
  'total hides zero scorer points',
)
assert(sortLeaderboardMembers(members, 'pointsMatchday').length === 3, 'matchday keeps everyone')

console.log('verify-leaderboard-filters: OK')
