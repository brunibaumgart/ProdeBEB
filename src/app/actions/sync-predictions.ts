'use server'

import { revalidatePath } from 'next/cache'

import { canEditBracketEntry } from '@/lib/bracket/lock'
import { getOrCreateBracketEntry, slotsToPredictionsMap } from '@/lib/queries/bracket'
import { getGroupStageMatches } from '@/lib/queries/matches'
import { requireDbUserForAction } from '@/lib/queries/users'
import { canEditPrediction } from '@/lib/matches/availability'
import { prisma } from '@/lib/prisma'

const GROUP_STAGE_LAST_MATCH_ID = 72

export type SyncGroupStageResult =
  | { ok: true; imported: number; skipped: number; message: string }
  | { ok: false; error: string }

export async function getGroupStageSyncStats(userId: string) {
  const [matchdayCount, bracketSlots, groupMatches] = await Promise.all([
    prisma.prediction.count({
      where: { userId, matchId: { lte: GROUP_STAGE_LAST_MATCH_ID } },
    }),
    prisma.bracketSlot.count({
      where: {
        bracketEntry: { userId },
        matchId: { lte: GROUP_STAGE_LAST_MATCH_ID },
        predHomeScore: { not: null },
        predAwayScore: { not: null },
      },
    }),
    getGroupStageMatches(),
  ])

  return {
    matchdayCount,
    completeCount: bracketSlots,
    totalGroupMatches: groupMatches.length,
  }
}

/** Copia predicciones de fase de grupos del Prode Completo → Fecha a Fecha. */
export async function syncGroupStageFromCompleteToMatchday(): Promise<SyncGroupStageResult> {
  const auth = await requireDbUserForAction()
  if (!auth.ok) return auth
  const user = auth.user

  const entry = await prisma.bracketEntry.findUnique({
    where: { userId: user.id },
    include: {
      slots: {
        where: { matchId: { lte: GROUP_STAGE_LAST_MATCH_ID } },
      },
    },
  })

  if (!entry || entry.slots.length === 0) {
    return { ok: false, error: 'No tenés predicciones de grupos en el Prode Completo.' }
  }

  const groupMatches = await getGroupStageMatches()
  const matchById = new Map(groupMatches.map((m) => [m.id, m]))

  let imported = 0
  let skipped = 0

  for (const slot of entry.slots) {
    if (slot.predHomeScore == null || slot.predAwayScore == null) continue

    const match = matchById.get(slot.matchId)
    if (!match) continue

    if (!canEditPrediction(match)) {
      skipped += 1
      continue
    }

    await prisma.prediction.upsert({
      where: { userId_matchId: { userId: user.id, matchId: slot.matchId } },
      create: {
        userId: user.id,
        matchId: slot.matchId,
        predHome: slot.predHomeScore,
        predAway: slot.predAwayScore,
      },
      update: {
        predHome: slot.predHomeScore,
        predAway: slot.predAwayScore,
      },
    })
    imported += 1
  }

  if (imported === 0) {
    return {
      ok: false,
      error:
        skipped > 0
          ? 'No se importó nada: todos los partidos elegibles ya están cerrados.'
          : 'No hay predicciones válidas para importar.',
    }
  }

  revalidatePath('/prode/fecha')
  revalidatePath('/prode')
  revalidatePath('/perfil')

  return {
    ok: true,
    imported,
    skipped,
    message: `Importadas ${imported} predicciones desde el Prode Completo${skipped > 0 ? ` (${skipped} omitidas por cierre)` : ''}.`,
  }
}

/** Copia predicciones de fase de grupos del Fecha a Fecha → Prode Completo. */
export async function syncGroupStageFromMatchdayToComplete(): Promise<SyncGroupStageResult> {
  const auth = await requireDbUserForAction()
  if (!auth.ok) return auth
  const user = auth.user

  const entry = await getOrCreateBracketEntry(user.id)
  if (!canEditBracketEntry(entry)) {
    return { ok: false, error: 'Tu Prode Completo está cerrado o confirmado.' }
  }

  const predictions = await prisma.prediction.findMany({
    where: { userId: user.id, matchId: { lte: GROUP_STAGE_LAST_MATCH_ID } },
  })

  if (predictions.length === 0) {
    return { ok: false, error: 'No tenés predicciones de grupos en Fecha a Fecha.' }
  }

  let imported = 0

  for (const prediction of predictions) {
    await prisma.bracketSlot.upsert({
      where: {
        bracketEntryId_matchId: {
          bracketEntryId: entry.id,
          matchId: prediction.matchId,
        },
      },
      create: {
        bracketEntryId: entry.id,
        matchId: prediction.matchId,
        predHomeScore: prediction.predHome,
        predAwayScore: prediction.predAway,
        predHomeTeamId: null,
        predAwayTeamId: null,
      },
      update: {
        predHomeScore: prediction.predHome,
        predAwayScore: prediction.predAway,
        predHomeTeamId: null,
        predAwayTeamId: null,
      },
    })
    imported += 1
  }

  await prisma.bracketSlot.deleteMany({
    where: { bracketEntryId: entry.id, matchId: { gt: GROUP_STAGE_LAST_MATCH_ID } },
  })

  await prisma.bracketEntry.update({
    where: { id: entry.id },
    data: { championId: null },
  })

  revalidatePath('/prode/completo')
  revalidatePath('/prode')
  revalidatePath('/perfil')

  return {
    ok: true,
    imported,
    skipped: 0,
    message: `Importadas ${imported} predicciones desde Fecha a Fecha. Se reiniciaron eliminatorias y campeón.`,
  }
}

/** Devuelve predicciones de grupos del completo como mapa (para hidratar UI tras sync). */
export async function getCompleteGroupPredictionsForUser(userId: string) {
  const entry = await prisma.bracketEntry.findUnique({
    where: { userId },
    include: { slots: { where: { matchId: { lte: GROUP_STAGE_LAST_MATCH_ID } } } },
  })
  return slotsToPredictionsMap(entry?.slots ?? [])
}
