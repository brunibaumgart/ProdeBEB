import type { Prisma, TournamentPaymentType } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import {
  createMercadoPagoPreference,
  fetchMercadoPagoPayment,
  isApprovedMercadoPagoPayment,
  isMercadoPagoConfigured,
} from '@/lib/payments/mercadopago'
import {
  createPrivateTournament,
  joinPrivateTournament,
  type CreatePrivateTournamentInput,
} from '@/lib/tournament/internal'
import {
  PAID_CREATE_PRICE_ARS,
  PAID_JOIN_PRICE_ARS,
} from '@/lib/tournament/quota-logic'

export type CreatePaymentMetadata = CreatePrivateTournamentInput

export type JoinPaymentMetadata = {
  tournamentId: string
  code: string
}

export async function createTournamentCheckout(
  userId: string,
  userEmail: string,
  input: CreatePrivateTournamentInput,
) {
  if (!isMercadoPagoConfigured()) {
    throw new Error('Mercado Pago no está configurado. Contactá al administrador.')
  }

  const payment = await prisma.tournamentPayment.create({
    data: {
      userId,
      type: 'tournament_create',
      amount: PAID_CREATE_PRICE_ARS,
      metadata: input as unknown as Prisma.InputJsonValue,
    },
  })

  try {
    const checkout = await createMercadoPagoPreference({
      paymentId: payment.id,
      title: 'Crear torneo privado · ProdeBEB',
      amount: PAID_CREATE_PRICE_ARS,
      payerEmail: userEmail,
    })

    await prisma.tournamentPayment.update({
      where: { id: payment.id },
      data: { preferenceId: checkout.preferenceId },
    })

    return { paymentId: payment.id, checkoutUrl: checkout.checkoutUrl }
  } catch (error) {
    await prisma.tournamentPayment.delete({ where: { id: payment.id } }).catch(() => undefined)
    throw error
  }
}

export async function createJoinCheckout(
  userId: string,
  userEmail: string,
  metadata: JoinPaymentMetadata,
  tournamentName: string,
) {
  if (!isMercadoPagoConfigured()) {
    throw new Error('Mercado Pago no está configurado. Contactá al administrador.')
  }

  const payment = await prisma.tournamentPayment.create({
    data: {
      userId,
      type: 'tournament_join',
      amount: PAID_JOIN_PRICE_ARS,
      metadata: metadata as unknown as Prisma.InputJsonValue,
    },
  })

  try {
    const checkout = await createMercadoPagoPreference({
      paymentId: payment.id,
      title: `Unirse a ${tournamentName} · ProdeBEB`,
      amount: PAID_JOIN_PRICE_ARS,
      payerEmail: userEmail,
    })

    await prisma.tournamentPayment.update({
      where: { id: payment.id },
      data: { preferenceId: checkout.preferenceId },
    })

    return { paymentId: payment.id, checkoutUrl: checkout.checkoutUrl }
  } catch (error) {
    await prisma.tournamentPayment.delete({ where: { id: payment.id } }).catch(() => undefined)
    throw error
  }
}

function parseCreateMetadata(metadata: Prisma.JsonValue): CreatePrivateTournamentInput {
  const data = metadata as CreatePrivateTournamentInput
  if (!data?.name || !data?.modes) {
    throw new Error('Metadata de pago inválida para crear torneo.')
  }
  return data
}

function parseJoinMetadata(metadata: Prisma.JsonValue): JoinPaymentMetadata {
  const data = metadata as JoinPaymentMetadata
  if (!data?.tournamentId || !data?.code) {
    throw new Error('Metadata de pago inválida para unirse a torneo.')
  }
  return data
}

async function fulfillPaymentRecord(paymentId: string) {
  const payment = await prisma.tournamentPayment.findUnique({ where: { id: paymentId } })
  if (!payment) return null
  if (payment.fulfilledAt) return payment
  if (payment.status !== 'approved') return payment

  if (payment.type === 'tournament_create') {
    const metadata = parseCreateMetadata(payment.metadata)
    const tournament = await createPrivateTournament(payment.userId, metadata)
    return prisma.tournamentPayment.update({
      where: { id: payment.id, fulfilledAt: null },
      data: { tournamentId: tournament.id, fulfilledAt: new Date() },
    })
  }

  const metadata = parseJoinMetadata(payment.metadata)
  await joinPrivateTournament(payment.userId, metadata.tournamentId)
  return prisma.tournamentPayment.update({
    where: { id: payment.id, fulfilledAt: null },
    data: { tournamentId: metadata.tournamentId, fulfilledAt: new Date() },
  })
}

export async function processMercadoPagoNotification(mercadoPagoPaymentId: string) {
  const mpPayment = await fetchMercadoPagoPayment(mercadoPagoPaymentId)
  const externalReference = mpPayment.external_reference
  if (!externalReference) return null

  const status = mpPayment.status ?? 'pending'
  const mappedStatus =
    status === 'approved'
      ? 'approved'
      : status === 'rejected' || status === 'cancelled'
        ? 'rejected'
        : 'pending'

  const payment = await prisma.tournamentPayment.update({
    where: { id: externalReference },
    data: {
      mercadoPagoPaymentId: String(mpPayment.id),
      status: mappedStatus,
    },
  })

  if (isApprovedMercadoPagoPayment(status)) {
    return fulfillPaymentRecord(payment.id)
  }

  return payment
}

export async function syncTournamentPaymentById(paymentId: string) {
  const payment = await prisma.tournamentPayment.findUnique({ where: { id: paymentId } })
  if (!payment) return null

  if (payment.mercadoPagoPaymentId) {
    return processMercadoPagoNotification(payment.mercadoPagoPaymentId)
  }

  if (payment.status === 'approved') {
    return fulfillPaymentRecord(payment.id)
  }

  return payment
}

export function paymentTypeLabel(type: TournamentPaymentType): string {
  return type === 'tournament_create' ? 'Creación de torneo' : 'Unión a torneo'
}
