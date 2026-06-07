import { isValidWorldCupAwardId, WORLD_CUP_AWARDS } from '../src/lib/awards/world-cup-awards'

function areWorldCupAwardsLocked(lockAt: Date): boolean {
  return Date.now() >= lockAt.getTime()
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

assert(WORLD_CUP_AWARDS.length === 10, 'world cup awards count')
assert(isValidWorldCupAwardId('top_scorer'), 'top scorer id')
assert(!isValidWorldCupAwardId('invalid'), 'invalid award id')

const future = new Date(Date.now() + 60_000)
const past = new Date(Date.now() - 60_000)

assert(!areWorldCupAwardsLocked(future), 'future lock open')
assert(areWorldCupAwardsLocked(past), 'past lock closed')

console.log('✓ verify-awards OK')
