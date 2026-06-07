import assert from 'node:assert/strict'

import {
  buildTournamentQuotaStatus,
  FREE_TOURNAMENT_CREATE_LIMIT,
  FREE_TOURNAMENT_JOIN_LIMIT,
} from '../src/lib/tournament/quota-logic'

function testFreshUserQuota() {
  const quota = buildTournamentQuotaStatus(0, 0, false)
  assert.equal(quota.createsRemaining, FREE_TOURNAMENT_CREATE_LIMIT)
  assert.equal(quota.joinsRemaining, FREE_TOURNAMENT_JOIN_LIMIT)
  assert.equal(quota.canCreateFree, true)
  assert.equal(quota.canJoinFree, true)
  assert.equal(quota.requiresPaymentToCreate, false)
  assert.equal(quota.requiresPaymentToJoin, false)
}

function testExhaustedCreates() {
  const quota = buildTournamentQuotaStatus(FREE_TOURNAMENT_CREATE_LIMIT, 0, false)
  assert.equal(quota.createsRemaining, 0)
  assert.equal(quota.canCreateFree, false)
  assert.equal(quota.requiresPaymentToCreate, true)
  assert.equal(quota.canJoinFree, true)
}

function testExhaustedJoins() {
  const quota = buildTournamentQuotaStatus(0, FREE_TOURNAMENT_JOIN_LIMIT, false)
  assert.equal(quota.joinsRemaining, 0)
  assert.equal(quota.canJoinFree, false)
  assert.equal(quota.requiresPaymentToJoin, true)
  assert.equal(quota.canCreateFree, true)
}

function testAdminUnlimited() {
  const quota = buildTournamentQuotaStatus(99, 99, true)
  assert.equal(quota.isUnlimited, true)
  assert.equal(quota.canCreateFree, true)
  assert.equal(quota.canJoinFree, true)
  assert.equal(quota.requiresPaymentToCreate, false)
  assert.equal(quota.requiresPaymentToJoin, false)
}

testFreshUserQuota()
testExhaustedCreates()
testExhaustedJoins()
testAdminUnlimited()

console.log('✓ tournament quota checks passed')
