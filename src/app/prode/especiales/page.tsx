import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'

import { AppShell } from '@/components/layout/app-shell'
import { WorldCupAwardsForm } from '@/components/prode/world-cup-awards-form'
import { canAccessTestContent } from '@/lib/auth/test-access'
import { areWorldCupAwardsLocked, getWorldCupAwardsLockInfo } from '@/lib/awards/lock'
import { WORLD_CUP_AWARDS } from '@/lib/awards/world-cup-awards'
import { getAwardPickOptions, getUserAwardPredictionsMap } from '@/lib/queries/awards'
import { ensureDbUser } from '@/lib/queries/users'
import { formatDbMatchKickoff } from '@/lib/time'

export default async function ProdeEspecialesPage() {
  const user = await ensureDbUser()
  if (!user) redirect('/prode')

  const { userId: clerkId } = await auth()
  const includeTestContent = await canAccessTestContent(clerkId)

  const [options, predictionsMap, lockInfo] = await Promise.all([
    getAwardPickOptions(includeTestContent),
    getUserAwardPredictionsMap(user.id),
    getWorldCupAwardsLockInfo(),
  ])

  const locked = areWorldCupAwardsLocked(lockInfo.lockAt)
  const lockLabel = formatDbMatchKickoff(lockInfo.lockAt, lockInfo.timeArg)

  const initialPredictions = WORLD_CUP_AWARDS.map((award) => {
    const prediction = predictionsMap.get(award.id)
    return {
      awardId: award.id,
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
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-gold/15 text-brand-gold">
          <Sparkles className="size-6" aria-hidden />
        </span>
        <div>
          <h1 className="font-heading text-3xl tracking-wide">ESPECIALES DEL MUNDIAL</h1>
          <p className="mt-2 text-muted-foreground">
            Predecí quién gana la Bota de Oro, el Balón de Oro, el Fair Play y otras distinciones
            FIFA del torneo.
          </p>
        </div>
      </div>

      {locked ? (
        <div className="mb-6 rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          Las predicciones especiales cerraron con el inicio del mundial ({lockLabel}). Podés ver
          lo que guardaste, pero ya no se pueden modificar.
        </div>
      ) : null}

      <WorldCupAwardsForm
        players={options.players}
        teams={options.teams}
        initialPredictions={initialPredictions}
        locked={locked}
        lockLabel={lockLabel}
      />
    </AppShell>
  )
}
