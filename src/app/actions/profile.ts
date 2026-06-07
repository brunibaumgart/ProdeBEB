'use server'

import { revalidatePath } from 'next/cache'

import { isUsernameTaken, validateUsername } from '@/lib/auth/username'
import { prisma } from '@/lib/prisma'
import { ensureDbUser } from '@/lib/queries/users'

export type ProfileActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string }

export async function chooseUsername(rawUsername: string): Promise<ProfileActionResult> {
  const user = await ensureDbUser()
  if (!user) return { ok: false, error: 'Tenés que iniciar sesión.' }

  if (user.hasChosenUsername) {
    return { ok: false, error: 'Ya elegiste tu nombre de usuario.' }
  }

  const validation = validateUsername(rawUsername)
  if (!validation.ok) return { ok: false, error: validation.error }

  if (await isUsernameTaken(validation.username, user.id)) {
    return { ok: false, error: 'Ese nombre de usuario ya está en uso. Probá con otro.' }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: validation.username,
      hasChosenUsername: true,
    },
  })

  revalidatePath('/', 'layout')

  return { ok: true, message: '¡Listo! Ya podés usar ProdeBEB.' }
}
