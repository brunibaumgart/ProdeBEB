'use server'

import { revalidatePath } from 'next/cache'

import { areWorldCupAwardsLocked, getWorldCupAwardsLockAt } from '@/lib/awards/lock'
import { getJuryCategoryById, isValidJuryCategoryId } from '@/lib/jury/jury-categories'
import { prisma } from '@/lib/prisma'
import { requireDbUserForAction } from '@/lib/queries/users'

export type JuryActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string }

export async function saveJuryPrediction(
  categoryId: string,
  selectionId: string,
): Promise<JuryActionResult> {
  const auth = await requireDbUserForAction()
  if (!auth.ok) return auth
  const user = auth.user

  if (!isValidJuryCategoryId(categoryId)) {
    return { ok: false, error: 'Categoría del jurado inválida.' }
  }

  const category = getJuryCategoryById(categoryId)!
  const lockAt = await getWorldCupAwardsLockAt()
  if (areWorldCupAwardsLocked(lockAt)) {
    return { ok: false, error: 'Las predicciones del jurado ya cerraron con el inicio del mundial.' }
  }

  if (!selectionId.trim()) {
    return { ok: false, error: 'Elegí una opción.' }
  }

  if (category.pickType === 'player') {
    const player = await prisma.player.findUnique({
      where: { id: selectionId },
      select: { id: true },
    })
    if (!player) return { ok: false, error: 'Jugador no encontrado.' }

    await prisma.juryPrediction.upsert({
      where: { userId_categoryId: { userId: user.id, categoryId } },
      create: {
        userId: user.id,
        categoryId,
        playerId: player.id,
        teamId: null,
      },
      update: {
        playerId: player.id,
        teamId: null,
      },
    })
  } else {
    const team = await prisma.team.findUnique({
      where: { id: selectionId },
      select: { id: true },
    })
    if (!team) return { ok: false, error: 'Selección no encontrada.' }

    await prisma.juryPrediction.upsert({
      where: { userId_categoryId: { userId: user.id, categoryId } },
      create: {
        userId: user.id,
        categoryId,
        teamId: team.id,
        playerId: null,
      },
      update: {
        teamId: team.id,
        playerId: null,
      },
    })
  }

  revalidatePath('/prode/jurado')
  revalidatePath('/prode')

  return { ok: true, message: 'Predicción guardada.' }
}

export async function clearJuryPrediction(categoryId: string): Promise<JuryActionResult> {
  const auth = await requireDbUserForAction()
  if (!auth.ok) return auth
  const user = auth.user

  if (!isValidJuryCategoryId(categoryId)) {
    return { ok: false, error: 'Categoría del jurado inválida.' }
  }

  const lockAt = await getWorldCupAwardsLockAt()
  if (areWorldCupAwardsLocked(lockAt)) {
    return { ok: false, error: 'Las predicciones del jurado ya cerraron con el inicio del mundial.' }
  }

  await prisma.juryPrediction.deleteMany({
    where: { userId: user.id, categoryId },
  })

  revalidatePath('/prode/jurado')
  revalidatePath('/prode')

  return { ok: true, message: 'Predicción eliminada.' }
}
