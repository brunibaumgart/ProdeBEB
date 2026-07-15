/**
 * Corrige el resultado de M102 (Semifinal, Inglaterra vs Argentina): estaba cargado
 * como 1-1 por error, el resultado real fue 1-2 (gol de Lautaro Martínez para Argentina).
 * Reproduce el mismo flujo que setMatchResult en src/app/actions/admin.ts:
 * recalcula puntos de fecha, goleadores, prode completo y avanza a Argentina
 * en el bracket (Final / Tercer puesto si corresponde).
 * npx tsx scripts/fix-match-102-arg-eng-semifinal.ts
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
config({ path: '.env' })

const MATCH_ID = 102
const NEW_HOME_SCORE = 1
const NEW_AWAY_SCORE = 2

async function main() {
  const { prisma } = await import('../src/lib/prisma')
  const { calculateMatchdayPoints } = await import('../src/lib/points')
  const { recalculateScorerPointsForMatch, saveMatchGoals } = await import(
    '../src/lib/scoring/scorers-engine'
  )
  const { recalculateCompleteScoringForMatch } = await import('../src/lib/scoring/complete')
  const { advanceKnockoutTeams, recalculateMatchdayPointsForMatch } = await import(
    '../src/lib/tournament/points'
  )

  const match = await prisma.match.findUnique({ where: { id: MATCH_ID } })
  if (!match) throw new Error(`Match ${MATCH_ID} no encontrado`)

  const lautaro = await prisma.player.findFirst({
    where: { name: { contains: 'Lautaro' }, teamId: match.awayTeamId ?? undefined },
  })
  if (!lautaro) throw new Error('No se encontró a Lautaro Martínez')

  const existingGoals = await prisma.matchGoal.findMany({ where: { matchId: MATCH_ID } })
  const homeScorerIds = existingGoals.filter((g) => g.isHome).map((g) => g.playerId!).filter(Boolean)
  const awayScorerIds = [
    ...existingGoals.filter((g) => !g.isHome).map((g) => g.playerId!).filter(Boolean),
    lautaro.id,
  ]

  console.log('Antes:', { homeScore: match.homeScore, awayScore: match.awayScore })
  console.log('Goleadores home:', homeScorerIds, '-> away:', awayScorerIds)

  await prisma.match.update({
    where: { id: MATCH_ID },
    data: { homeScore: NEW_HOME_SCORE, awayScore: NEW_AWAY_SCORE, penaltiesWinnerId: null },
  })

  await saveMatchGoals(MATCH_ID, homeScorerIds, awayScorerIds)

  const isKnockout = match.round !== 'Group Stage'
  const predictions = await prisma.prediction.findMany({ where: { matchId: MATCH_ID } })

  for (const prediction of predictions) {
    const points = calculateMatchdayPoints(
      {
        predHome: prediction.predHome,
        predAway: prediction.predAway,
        predPenaltiesWinnerId: prediction.predPenaltiesWinnerId,
      },
      {
        homeScore: NEW_HOME_SCORE,
        awayScore: NEW_AWAY_SCORE,
        penaltiesWinnerId: null,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
      },
      isKnockout,
    )
    if (points !== prediction.points) {
      await prisma.prediction.update({ where: { id: prediction.id }, data: { points } })
      console.log(`  · ${prediction.userId}: ${prediction.points ?? '—'} -> ${points}`)
    }
  }

  await recalculateScorerPointsForMatch(MATCH_ID)
  await recalculateMatchdayPointsForMatch(MATCH_ID)

  await advanceKnockoutTeams(
    MATCH_ID,
    match.homeTeamId,
    match.awayTeamId,
    NEW_HOME_SCORE,
    NEW_AWAY_SCORE,
    null,
  )

  await recalculateCompleteScoringForMatch(MATCH_ID)

  const after = await prisma.match.findUnique({
    where: { id: MATCH_ID },
    include: { homeTeam: true, awayTeam: true, goals: { include: { player: true } } },
  })
  console.log('Después:', {
    score: `${after?.homeTeam?.name} ${after?.homeScore} - ${after?.awayScore} ${after?.awayTeam?.name}`,
    goals: after?.goals.map((g) => `${g.isHome ? 'H' : 'A'}:${g.player?.name}`),
  })

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
