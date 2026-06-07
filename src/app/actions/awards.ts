'use server'

import { revalidatePath } from 'next/cache'

import { areWorldCupAwardsLocked, getWorldCupAwardsLockAt } from '@/lib/awards/lock'
import { getWorldCupAwardById, isValidWorldCupAwardId } from '@/lib/awards/world-cup-awards'
import { prisma } from '@/lib/prisma'
import { requireDbUserForAction } from '@/lib/queries/users'

export type AwardActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string }

export async function saveAwardPrediction(
  awardId: string,
  selectionId: string,
): Promise<AwardActionResult> {
  const auth = await requireDbUserForAction()
  if (!auth.ok) return auth
  const user = auth.user

  if (!isValidWorldCupAwardId(awardId)) {
    return { ok: false, error: 'Predicción especial inválida.' }
  }

  const award = getWorldCupAwardById(awardId)!
  const lockAt = await getWorldCupAwardsLockAt()
  if (areWorldCupAwardsLocked(lockAt)) {
    return { ok: false, error: 'Las predicciones especiales ya cerraron con el inicio del mundial.' }
  }

  if (!selectionId.trim()) {
    return { ok: false, error: 'Elegí una opción.' }
  }

  if (award.pickType === 'player') {
    const player = await prisma.player.findUnique({
      where: { id: selectionId },
      select: { id: true, position: true },
    })
    if (!player) return { ok: false, error: 'Jugador no encontrado.' }
    if (award.playerFilter === 'goalkeeper' && player.position !== 'Portero') {
      return { ok: false, error: 'Este especial solo admite arqueros.' }
    }

    await prisma.awardPrediction.upsert({
      where: { userId_awardId: { userId: user.id, awardId } },
      create: {
        userId: user.id,
        awardId,
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

    await prisma.awardPrediction.upsert({
      where: { userId_awardId: { userId: user.id, awardId } },
      create: {
        userId: user.id,
        awardId,
        teamId: team.id,
        playerId: null,
      },
      update: {
        teamId: team.id,
        playerId: null,
      },
    })
  }

  revalidatePath('/prode/especiales')
  revalidatePath('/prode')

  return { ok: true, message: 'Predicción guardada.' }
}

export async function clearAwardPrediction(awardId: string): Promise<AwardActionResult> {
  const auth = await requireDbUserForAction()
  if (!auth.ok) return auth
  const user = auth.user

  if (!isValidWorldCupAwardId(awardId)) {
    return { ok: false, error: 'Predicción especial inválida.' }
  }

  const lockAt = await getWorldCupAwardsLockAt()
  if (areWorldCupAwardsLocked(lockAt)) {
    return { ok: false, error: 'Las predicciones especiales ya cerraron con el inicio del mundial.' }
  }

  await prisma.awardPrediction.deleteMany({
    where: { userId: user.id, awardId },
  })

  revalidatePath('/prode/especiales')
  revalidatePath('/prode')

  return { ok: true, message: 'Predicción eliminada.' }
}
