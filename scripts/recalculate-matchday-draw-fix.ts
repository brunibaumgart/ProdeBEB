/**
 * Recalcula Prediction.points de partidos finalizados con la regla corregida de empates.
 * npx tsx scripts/recalculate-matchday-draw-fix.ts
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
config({ path: '.env' })

async function main() {
  const { recalculateAllFinishedMatchdayPoints } = await import(
    '../src/lib/tournament/recalculate-matchday'
  )
  const result = await recalculateAllFinishedMatchdayPoints()
  console.log('OK recálculo Fecha a Fecha')
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
