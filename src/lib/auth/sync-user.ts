import type { UserJSON } from '@clerk/backend'
import type { User } from '@clerk/backend'

import { prisma } from '@/lib/prisma'

const GLOBAL_TOURNAMENT_CODE = 'GLOBAL'

function getPrimaryEmailFromJson(data: UserJSON): string {
  const primary = data.email_addresses.find(
    (email) => email.id === data.primary_email_address_id
  )
  return primary?.email_address ?? data.email_addresses[0]?.email_address ?? ''
}

function getDisplayNameFromJson(data: UserJSON): string {
  const parts = [data.first_name, data.last_name].filter(Boolean)
  return parts.join(' ').trim() || 'Usuario'
}

function getPrimaryEmailFromUser(user: User): string {
  return user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? ''
}

function getDisplayNameFromUser(user: User): string {
  return user.fullName?.trim() || user.firstName?.trim() || 'Usuario'
}

async function joinGlobalTournament(userId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { code: GLOBAL_TOURNAMENT_CODE },
  })

  if (!tournament) return

  await prisma.tournamentMember.upsert({
    where: {
      userId_tournamentId: {
        userId,
        tournamentId: tournament.id,
      },
    },
    create: {
      userId,
      tournamentId: tournament.id,
    },
    update: {},
  })
}

export async function syncUserFromWebhook(data: UserJSON) {
  const email = getPrimaryEmailFromJson(data)
  if (!email) {
    throw new Error(`Clerk user ${data.id} has no email address`)
  }

  const existing = await prisma.user.findUnique({
    where: { clerkId: data.id },
    select: { hasChosenUsername: true },
  })

  const user = await prisma.user.upsert({
    where: { clerkId: data.id },
    create: {
      clerkId: data.id,
      name: getDisplayNameFromJson(data),
      email,
      avatar: null,
      hasChosenUsername: false,
    },
    update: {
      email,
      avatar: null,
      ...(existing?.hasChosenUsername ? {} : { name: getDisplayNameFromJson(data) }),
    },
  })

  await joinGlobalTournament(user.id)
  return user
}

export async function syncUserFromClerk(clerkUser: User) {
  const email = getPrimaryEmailFromUser(clerkUser)
  if (!email) {
    throw new Error(`Clerk user ${clerkUser.id} has no email address`)
  }

  const existing = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    select: { hasChosenUsername: true },
  })

  const user = await prisma.user.upsert({
    where: { clerkId: clerkUser.id },
    create: {
      clerkId: clerkUser.id,
      name: getDisplayNameFromUser(clerkUser),
      email,
      avatar: null,
      hasChosenUsername: false,
    },
    update: {
      email,
      avatar: null,
      ...(existing?.hasChosenUsername ? {} : { name: getDisplayNameFromUser(clerkUser) }),
    },
  })

  await joinGlobalTournament(user.id)
  return user
}

export async function deleteUserByClerkId(clerkId: string) {
  await prisma.user.deleteMany({ where: { clerkId } })
}
