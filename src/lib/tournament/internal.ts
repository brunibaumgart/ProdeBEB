import { prisma } from '@/lib/prisma'

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
export const TOURNAMENT_CODE_LENGTH = 6
const MAX_CODE_ATTEMPTS = 10

export type TournamentModes = {
  matchday: boolean
  complete: boolean
  scorers: boolean
}

export type CreatePrivateTournamentInput = {
  name: string
  description: string | null
  modes: TournamentModes
}

async function generateUniqueCode(): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    let code = ''
    for (let i = 0; i < TOURNAMENT_CODE_LENGTH; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    }
    const existing = await prisma.tournament.findUnique({ where: { code } })
    if (!existing) return code
  }
  return null
}

export async function createPrivateTournament(userId: string, input: CreatePrivateTournamentInput) {
  const code = await generateUniqueCode()
  if (!code) {
    throw new Error('No se pudo generar un código único.')
  }

  return prisma.tournament.create({
    data: {
      name: input.name,
      description: input.description,
      code,
      createdById: userId,
      modeMatchday: input.modes.matchday,
      modeComplete: input.modes.complete,
      modeScorers: input.modes.scorers,
      members: {
        create: { userId },
      },
    },
  })
}

export async function joinPrivateTournament(userId: string, tournamentId: string) {
  const existing = await prisma.tournamentMember.findUnique({
    where: { userId_tournamentId: { userId, tournamentId } },
  })
  if (existing) {
    throw new Error('Ya formás parte de este torneo.')
  }

  return prisma.tournamentMember.create({
    data: { userId, tournamentId },
  })
}

export function validateCreateInput(
  name: string,
  modes: TournamentModes,
): { ok: true; name: string } | { ok: false; error: string } {
  const trimmedName = name.trim()
  if (trimmedName.length < 3 || trimmedName.length > 60) {
    return { ok: false, error: 'El nombre debe tener entre 3 y 60 caracteres.' }
  }
  if (!modes.matchday && !modes.complete && !modes.scorers) {
    return { ok: false, error: 'Activá al menos un modo de juego.' }
  }
  return { ok: true, name: trimmedName }
}
