/**
 * Crea el usuario bot "IA" y carga predicciones Fecha a Fecha (con goleadores)
 * desde el partido M4 en adelante. Los partidos M1–M3 no se cargan.
 *
 * Ejecutar: npm run seed:ai-predictions
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

import {
  AI_BOT_CLERK_ID,
  AI_BOT_EMAIL,
  AI_BOT_NAME,
  AI_FECHA_FIRST_MATCH_ID,
} from '../src/lib/ai/bot-user'
import {
  pickScorerIdsForGoals,
  predictMatchScore,
} from '../src/lib/ai/fecha-prediction-engine'
import { resolveDatabaseUrl } from '../src/lib/database-url'

const GLOBAL_TOURNAMENT_CODE = 'GLOBAL'

const prisma = new PrismaClient({ adapter: new PrismaPg(resolveDatabaseUrl()) })

async function ensureAiUser() {
  const user = await prisma.user.upsert({
    where: { clerkId: AI_BOT_CLERK_ID },
    create: {
      clerkId: AI_BOT_CLERK_ID,
      name: AI_BOT_NAME,
      email: AI_BOT_EMAIL,
      hasChosenUsername: true,
      isAdmin: false,
      isTester: false,
    },
    update: {
      name: AI_BOT_NAME,
      hasChosenUsername: true,
    },
  })

  const tournament = await prisma.tournament.findUnique({
    where: { code: GLOBAL_TOURNAMENT_CODE },
  })

  if (tournament) {
    await prisma.tournamentMember.upsert({
      where: {
        userId_tournamentId: {
          userId: user.id,
          tournamentId: tournament.id,
        },
      },
      create: {
        userId: user.id,
        tournamentId: tournament.id,
      },
      update: {},
    })
  }

  return user
}

async function upsertPredictionScorers(
  predictionId: string,
  homeScorerIds: string[],
  awayScorerIds: string[],
) {
  await prisma.predictionScorer.deleteMany({ where: { predictionId } })

  const rows = [
    ...homeScorerIds.map((playerId) => ({
      predictionId,
      playerId,
      isHome: true,
    })),
    ...awayScorerIds.map((playerId) => ({
      predictionId,
      playerId,
      isHome: false,
    })),
  ]

  if (rows.length > 0) {
    await prisma.predictionScorer.createMany({ data: rows })
  }
}

async function main() {
  const user = await ensureAiUser()
  console.log(`Usuario bot: ${user.name} (${user.id})`)

  const [matches, players] = await Promise.all([
    prisma.match.findMany({
      where: {
        id: { gte: AI_FECHA_FIRST_MATCH_ID },
        isTest: false,
        homeTeamId: { not: null },
        awayTeamId: { not: null },
      },
      include: {
        homeTeam: { select: { id: true, name: true, nameEs: true } },
        awayTeam: { select: { id: true, name: true, nameEs: true } },
      },
      orderBy: { id: 'asc' },
    }),
    prisma.player.findMany({
      where: { team: { isTest: false } },
      select: {
        id: true,
        teamId: true,
        position: true,
        internationalMatches: true,
      },
    }),
  ])

  let created = 0
  let updated = 0

  for (const match of matches) {
    const homeName = match.homeTeam!.name
    const awayName = match.awayTeam!.name
    const { predHome, predAway } = predictMatchScore(homeName, awayName)

    const homeScorerIds = pickScorerIdsForGoals(match.homeTeamId!, predHome, players)
    const awayScorerIds = pickScorerIdsForGoals(match.awayTeamId!, predAway, players)

    const existing = await prisma.prediction.findUnique({
      where: {
        userId_matchId: {
          userId: user.id,
          matchId: match.id,
        },
      },
    })

    const prediction = await prisma.prediction.upsert({
      where: {
        userId_matchId: {
          userId: user.id,
          matchId: match.id,
        },
      },
      create: {
        userId: user.id,
        matchId: match.id,
        predHome,
        predAway,
      },
      update: {
        predHome,
        predAway,
      },
    })

    await upsertPredictionScorers(prediction.id, homeScorerIds, awayScorerIds)

    const label = `M${match.id} ${match.homeTeam!.nameEs} vs ${match.awayTeam!.nameEs}`
    console.log(
      `✓ ${label}: ${predHome}-${predAway} (${homeScorerIds.length}+${awayScorerIds.length} goleadores)`,
    )

    if (existing) updated += 1
    else created += 1
  }

  console.log(`\nListo: ${matches.length} predicciones (${created} nuevas, ${updated} actualizadas).`)
  console.log('Partidos M1–M3 omitidos a pedido.')
  console.log(
    'Eliminatorias: se cargan cuando el partido ya tiene ambos equipos asignados en la BD.',
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
