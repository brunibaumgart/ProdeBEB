import { Trophy } from 'lucide-react'
import { SignInButton } from '@clerk/nextjs'

import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { CreateTournamentDialog } from '@/components/torneos/create-tournament-dialog'
import { JoinTournamentForm } from '@/components/torneos/join-tournament-form'
import { TournamentCard } from '@/components/torneos/tournament-card'
import { TournamentQuotaBanner } from '@/components/torneos/tournament-quota-banner'
import { getUserTournaments } from '@/lib/queries/tournaments'
import { ensureDbUser } from '@/lib/queries/users'
import { getTournamentQuotaStatus } from '@/lib/tournament/quotas'

export default async function TorneosPage() {
  const user = await ensureDbUser()

  if (!user) {
    return (
      <AppShell pathname="/torneos">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Trophy className="size-6" aria-hidden />
          </span>
          <h1 className="font-heading text-3xl tracking-wide">TORNEOS</h1>
          <p className="text-muted-foreground">
            Iniciá sesión para crear o unirte a torneos privados con tus amigos.
          </p>
          <SignInButton mode="modal">
            <Button>Ingresar</Button>
          </SignInButton>
        </div>
      </AppShell>
    )
  }

  const tournaments = await getUserTournaments(user.id)
  const quota = await getTournamentQuotaStatus(user)

  return (
    <AppShell pathname="/torneos">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl tracking-wide">MIS TORNEOS</h1>
          <p className="mt-2 text-muted-foreground">
            Competí en privado con tus amigos durante todo el mundial.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <JoinTournamentForm quota={quota} />
          <CreateTournamentDialog quota={quota} />
        </div>
      </div>

      <TournamentQuotaBanner quota={quota} />

      {tournaments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <p>Todavía no formás parte de ningún torneo privado.</p>
          <p className="mt-1 text-sm">Creá uno o unite con un código para empezar a competir.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tournaments.map(({ tournament, membership, memberCount, rank }) => (
            <TournamentCard
              key={tournament.id}
              id={tournament.id}
              name={tournament.name}
              description={tournament.description}
              code={tournament.code}
              memberCount={memberCount}
              pointsTotal={membership.pointsTotal}
              rank={rank}
              isOwner={tournament.createdById === user.id}
            />
          ))}
        </div>
      )}
    </AppShell>
  )
}
