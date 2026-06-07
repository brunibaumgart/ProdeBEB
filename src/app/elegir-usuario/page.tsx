import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { ChooseUsernameForm } from '@/components/perfil/choose-username-form'
import { normalizeUsername, validateUsername } from '@/lib/auth/username'
import { ensureDbUser } from '@/lib/queries/users'

function getSuggestedUsername(clerkUser: NonNullable<Awaited<ReturnType<typeof currentUser>>>) {
  const candidates = [
    clerkUser.username,
    clerkUser.firstName,
    clerkUser.fullName?.split(/\s+/)[0],
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    const validation = validateUsername(candidate)
    if (validation.ok) return validation.username
  }

  const emailPrefix = clerkUser.primaryEmailAddress?.emailAddress.split('@')[0]
  if (emailPrefix) {
    const validation = validateUsername(emailPrefix)
    if (validation.ok) return validation.username
  }

  return normalizeUsername(clerkUser.firstName ?? '') || null
}

export default async function ElegirUsuarioPage() {
  const clerkUser = await currentUser()
  if (!clerkUser) redirect('/')

  const dbUser = await ensureDbUser()
  if (!dbUser) redirect('/')

  if (dbUser.hasChosenUsername) redirect('/prode')

  const suggestedUsername = getSuggestedUsername(clerkUser)

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-brand-gold">Bienvenido a ProdeBEB</p>
        <h1 className="mt-2 font-heading text-4xl tracking-wide">ELEGÍ TU USUARIO</h1>
        <p className="mt-3 text-muted-foreground">
          Este nombre aparece en rankings y torneos privados.
        </p>
      </div>

      <div className="mt-8 w-full max-w-lg">
        <ChooseUsernameForm suggestedUsername={suggestedUsername} />
      </div>
    </div>
  )
}
