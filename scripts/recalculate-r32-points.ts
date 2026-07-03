/**
 * Recalcula los puntos de fecha a fecha (+ goleadores + completo) de todos los partidos ya
 * finalizados de Round of 32, para aplicar la nueva regla de +1 pt cuando el equipo elegido
 * como ganador por penales termina ganando el partido directo (sin ir a penales).
 * npx tsx scripts/recalculate-r32-points.ts
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
config({ path: '.env' })

async function main() {
  const { prisma } = await import('../src/lib/prisma')
  const { calculateMatchdayPoints } = await import('../src/lib/points')
  const { recalculateScorerPointsForMatch } = await import('../src/lib/scoring/scorers-engine')
  const { recalculateCompleteScoringForMatch } = await import('../src/lib/scoring/complete')
  const { recalculateMatchdayPointsForMatch } = await import('../src/lib/tournament/points')

  const matches = await prisma.match.findMany({
    where: { round: 'Round of 32', status: 'finished', isTest: false },
    orderBy: { id: 'asc' },
  })

  console.log(`Recalculando ${matches.length} partido(s) de Round of 32...`)

  for (const match of matches) {
    if (match.homeScore == null || match.awayScore == null) continue
    const { id: matchId, homeScore, awayScore, penaltiesWinnerId, round, homeTeamId, awayTeamId } = match
    const isKnockout = round !== 'Group Stage'

    const predictions = await prisma.prediction.findMany({ where: { matchId } })
    let changed = 0

    for (const prediction of predictions) {
      const points = calculateMatchdayPoints(
        { predHome: prediction.predHome, predAway: prediction.predAway, predPenaltiesWinnerId: prediction.predPenaltiesWinnerId },
        { homeScore, awayScore, penaltiesWinnerId, homeTeamId, awayTeamId },
        isKnockout,
      )
      if (points !== prediction.points) {
        await prisma.prediction.update({ where: { id: prediction.id }, data: { points } })
        changed++
        console.log(`  · ${prediction.userId}: ${prediction.points ?? '—'} -> ${points}`)
      }
    }

    await recalculateScorerPointsForMatch(matchId)
    await recalculateMatchdayPointsForMatch(matchId)
    await recalculateCompleteScoringForMatch(matchId)

    console.log(`✓ M${matchId}: ${predictions.length} predicción(es), ${changed} actualizada(s)`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
