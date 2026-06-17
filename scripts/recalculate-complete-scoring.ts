/**
 * Recalcula puntos del Prode Completo para todos los bracket entries.
 * npx tsx scripts/recalculate-complete-scoring.ts
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
config({ path: '.env' })

async function main() {
  const { prisma } = await import('../src/lib/prisma')
  const { recalculateCompleteScoringForUser } = await import('../src/lib/scoring/complete/engine')

  const entries = await prisma.bracketEntry.findMany({ select: { userId: true } })
  let processed = 0

  for (const entry of entries) {
    await recalculateCompleteScoringForUser(entry.userId)
    processed += 1
  }

  console.log('OK recálculo Prode Completo')
  console.log(JSON.stringify({ entriesProcessed: processed }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
