const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,19}$/

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

export function validateUsername(raw: string): { ok: true; username: string } | { ok: false; error: string } {
  const username = normalizeUsername(raw)

  if (!username) {
    return { ok: false, error: 'Ingresá un nombre de usuario.' }
  }

  if (!USERNAME_PATTERN.test(username)) {
    return {
      ok: false,
      error:
        'El nombre de usuario debe tener entre 3 y 20 caracteres, empezar con una letra y usar solo letras, números o guión bajo.',
    }
  }

  return { ok: true, username }
}

export async function isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
  const { prisma } = await import('@/lib/prisma')

  const existing = await prisma.user.findFirst({
    where: {
      name: { equals: username, mode: 'insensitive' },
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
    },
    select: { id: true },
  })

  return existing != null
}
