import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, UsersRound } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'

import { AppShell } from '@/components/layout/app-shell'
import { JuryPredictionsForm } from '@/components/prode/jury-predictions-form'
import { canAccessTestContent } from '@/lib/auth/test-access'
import { areWorldCupAwardsLocked, getWorldCupAwardsLockInfo } from '@/lib/awards/lock'
import { JURY_CATEGORIES } from '@/lib/jury/jury-categories'
import { getAwardPickOptions } from '@/lib/queries/awards'
import { getUserJuryPredictionsMap } from '@/lib/queries/jury'
import { ensureDbUser } from '@/lib/queries/users'
import { formatDbMatchKickoff } from '@/lib/time'

export default async function ProdeJuradoPage() {
  const user = await ensureDbUser()
  if (!user) redirect('/prode')

  const { userId: clerkId } = await auth()
  const includeTestContent = await canAccessTestContent(clerkId)

  const [options, predictionsMap, lockInfo] = await Promise.all([
    getAwardPickOptions(includeTestContent),
    getUserJuryPredictionsMap(user.id),
    getWorldCupAwardsLockInfo(),
  ])

  const locked = areWorldCupAwardsLocked(lockInfo.lockAt)
  const lockLabel = formatDbMatchKickoff(lockInfo.lockAt, lockInfo.timeArg)

  const initialPredictions = JURY_CATEGORIES.map((category) => {
    const prediction = predictionsMap.get(category.id)
    return {
      categoryId: category.id,
      playerId: prediction?.playerId ?? null,
      teamId: prediction?.teamId ?? null,
    }
  })

  return (
    <AppShell pathname="/prode">
      <Link
        href="/prode"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver al Prode
      </Link>

      <div className="mb-6 flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <UsersRound className="size-6" aria-hidden />
        </span>
        <div>
          <h1 className="font-heading text-3xl tracking-wide">PRODE DEL JURADO</h1>
          <p className="mt-2 text-muted-foreground">
            Predicciones subjetivas sobre selecciones y jugadores. Al final del torneo, el jurado
            emite sus votos y eso define quién suma puntos.
          </p>
        </div>
      </div>

      {locked ? (
        <div className="mb-6 rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          Las predicciones del jurado cerraron con el inicio del mundial ({lockLabel}). Podés ver lo
          que guardaste, pero ya no se pueden modificar.
        </div>
      ) : null}

      <JuryPredictionsForm
        players={options.players}
        teams={options.teams}
        initialPredictions={initialPredictions}
        locked={locked}
        lockLabel={lockLabel}
      />
    </AppShell>
  )
}
