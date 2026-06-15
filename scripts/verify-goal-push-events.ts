/**
 * Verifica detección de goles nuevos para push.
 * Ejecutar: npx tsx scripts/verify-goal-push-events.ts
 */
import { diffGoalEvents } from '../src/lib/push/goal-events'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

const oneNewHomeGoal = diffGoalEvents({
  previousHomeScore: 1,
  previousAwayScore: 0,
  previousHomeScorers: ['p1'],
  previousAwayScorers: [],
  nextHomeScore: 2,
  nextAwayScore: 0,
  nextHomeScorers: ['p1', 'p2'],
  nextAwayScorers: [],
})

assert(oneNewHomeGoal.length === 1, 'one new home goal')
assert(oneNewHomeGoal[0]?.isHome === true, 'home side')
assert(oneNewHomeGoal[0]?.scorerId === 'p2', 'second scorer id')

const noChange = diffGoalEvents({
  previousHomeScore: 2,
  previousAwayScore: 1,
  previousHomeScorers: ['p1', 'p2'],
  previousAwayScorers: ['p3'],
  nextHomeScore: 2,
  nextAwayScore: 1,
  nextHomeScorers: ['p1', 'p2'],
  nextAwayScorers: ['p3'],
})

assert(noChange.length === 0, 'no events when score unchanged')

console.log('verify-goal-push-events: OK')
