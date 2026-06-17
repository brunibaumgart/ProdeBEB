/**
 * Recalcula Prediction.points de partidos finalizados con la regla corregida de empates.
 * npx tsx scripts/recalculate-matchday-draw-fix.ts
 */
import { recalculateAllFinishedMatchdayPoints } from '../src/lib/tournament/recalculate-matchday'

async function main() {
  const result = await recalculateAllFinishedMatchdayPoints()
  console.log('OK recálculo Fecha a Fecha')
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
