'use server'

import { revalidatePath } from 'next/cache'

import {
  createJoinCheckout,
  createTournamentCheckout,
  syncTournamentPaymentById,
} from '@/lib/payments/tournament-checkout'
import { isMercadoPagoConfigured } from '@/lib/payments/mercadopago'
import { prisma } from '@/lib/prisma'
import { requireDbUserForAction } from '@/lib/queries/users'
import { findTournamentByCode } from '@/lib/queries/tournaments'
import {
  createPrivateTournament,
  joinPrivateTournament,
  validateCreateInput,
  TOURNAMENT_CODE_LENGTH,
} from '@/lib/tournament/internal'
import {
  getTournamentQuotaStatus,
  GLOBAL_TOURNAMENT_CODE,
  quotaCreateBlockedMessage,
  quotaJoinBlockedMessage,
} from '@/lib/tournament/quotas'

export type TournamentActionResult =
  | { ok: true; message: string; tournamentId?: string; checkoutUrl?: string }
  | {
      ok: false
      error: string
      requiresPayment?: boolean
      paymentType?: 'create' | 'join'
    }

export async function createTournament(
  name: string,
  description: string | null,
  modes: { matchday: boolean; complete: boolean; scorers: boolean },
): Promise<TournamentActionResult> {
  const auth = await requireDbUserForAction()
  if (!auth.ok) return auth
  const user = auth.user

  const validation = validateCreateInput(name, modes)
  if (!validation.ok) return { ok: false, error: validation.error }

  const trimmedDescription = description?.trim() || null
  const quota = await getTournamentQuotaStatus(user)

  if (!quota.canCreateFree) {
    if (!isMercadoPagoConfigured()) {
      return { ok: false, error: quotaCreateBlockedMessage(), requiresPayment: true, paymentType: 'create' }
    }

    try {
      const checkout = await createTournamentCheckout(user.id, user.email, {
        name: validation.name,
        description: trimmedDescription,
        modes,
      })
      return {
        ok: true,
        message: 'Te redirigimos a Mercado Pago para completar el pago.',
        checkoutUrl: checkout.checkoutUrl,
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'No se pudo iniciar el pago.',
      }
    }
  }

  try {
    const tournament = await createPrivateTournament(user.id, {
      name: validation.name,
      description: trimmedDescription,
      modes,
    })
    revalidatePath('/torneos')
    return {
      ok: true,
      message: `Torneo creado. Código: ${tournament.code}`,
      tournamentId: tournament.id,
    }
  } catch {
    return { ok: false, error: 'No se pudo crear el torneo.' }
  }
}

export async function joinTournament(code: string): Promise<TournamentActionResult> {
  const auth = await requireDbUserForAction()
  if (!auth.ok) return auth
  const user = auth.user

  const trimmedCode = code.trim().toUpperCase()
  if (trimmedCode.length !== TOURNAMENT_CODE_LENGTH) {
    return { ok: false, error: `El código tiene que tener ${TOURNAMENT_CODE_LENGTH} caracteres.` }
  }

  const tournament = await findTournamentByCode(trimmedCode)
  if (!tournament) {
    return { ok: false, error: 'No encontramos ningún torneo con ese código.' }
  }

  const existing = await prisma.tournamentMember.findUnique({
    where: { userId_tournamentId: { userId: user.id, tournamentId: tournament.id } },
  })
  if (existing) {
    return { ok: false, error: 'Ya formás parte de este torneo.' }
  }

  const quota = await getTournamentQuotaStatus(user)
  const needsPayment = tournament.code !== GLOBAL_TOURNAMENT_CODE && !quota.canJoinFree

  if (needsPayment) {
    if (!isMercadoPagoConfigured()) {
      return { ok: false, error: quotaJoinBlockedMessage(), requiresPayment: true, paymentType: 'join' }
    }

    try {
      const checkout = await createJoinCheckout(
        user.id,
        user.email,
        { tournamentId: tournament.id, code: trimmedCode },
        tournament.name,
      )
      return {
        ok: true,
        message: 'Te redirigimos a Mercado Pago para completar el pago.',
        checkoutUrl: checkout.checkoutUrl,
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'No se pudo iniciar el pago.',
      }
    }
  }

  try {
    await joinPrivateTournament(user.id, tournament.id)
    revalidatePath('/torneos')
    return { ok: true, message: `Te uniste a "${tournament.name}".`, tournamentId: tournament.id }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo unir al torneo.',
    }
  }
}

export async function refreshTournamentPayment(paymentId: string): Promise<TournamentActionResult> {
  const auth = await requireDbUserForAction()
  if (!auth.ok) return auth
  const user = auth.user

  const payment = await syncTournamentPaymentById(paymentId)
  if (!payment || payment.userId !== user.id) {
    return { ok: false, error: 'Pago no encontrado.' }
  }

  revalidatePath('/torneos')

  if (payment.status === 'approved' && payment.fulfilledAt) {
    return {
      ok: true,
      message:
        payment.type === 'tournament_create'
          ? 'Pago confirmado. Tu torneo ya está listo.'
          : 'Pago confirmado. Ya formás parte del torneo.',
      tournamentId: payment.tournamentId ?? undefined,
    }
  }

  if (payment.status === 'pending') {
    return { ok: false, error: 'El pago sigue pendiente. Esperá unos segundos y recargá.' }
  }

  return { ok: false, error: 'El pago no fue aprobado.' }
}

export async function kickMember(
  tournamentId: string,
  memberId: string,
): Promise<TournamentActionResult> {
  const auth = await requireDbUserForAction()
  if (!auth.ok) return auth
  const user = auth.user

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } })
  if (!tournament) return { ok: false, error: 'Torneo no encontrado.' }

  if (tournament.createdById !== user.id) {
    return { ok: false, error: 'Solo el creador puede expulsar miembros.' }
  }

  const member = await prisma.tournamentMember.findUnique({ where: { id: memberId } })
  if (!member || member.tournamentId !== tournamentId) {
    return { ok: false, error: 'Miembro no encontrado.' }
  }

  if (member.userId === user.id) {
    return { ok: false, error: 'No podés expulsarte a vos mismo.' }
  }

  await prisma.tournamentMember.delete({ where: { id: memberId } })

  revalidatePath(`/torneos/${tournamentId}`)

  return { ok: true, message: 'Miembro expulsado.' }
}
