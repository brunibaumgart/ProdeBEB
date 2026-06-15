/**
 * Verifica copy de push al finalizar partido.
 * Ejecutar: npx tsx scripts/verify-match-finished-push.ts
 */
import { buildMatchFinishedNotificationCopy } from '../src/lib/push/match-copy'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

const copy = buildMatchFinishedNotificationCopy(
  {
    homeTeam: { flagEmoji: '🇦🇷' },
    awayTeam: { flagEmoji: '🇲🇽' },
  } as Parameters<typeof buildMatchFinishedNotificationCopy>[0],
  2,
  1,
)

assert(copy.title.includes('Final del partido'), 'title mentions final')
assert(copy.title.includes('🇦🇷'), 'title includes flags')
assert(copy.body.includes('2-1'), 'body includes score')
assert(copy.body.toLowerCase().includes('prode'), 'body nudges prode check')

console.log('verify-match-finished-push: OK')
