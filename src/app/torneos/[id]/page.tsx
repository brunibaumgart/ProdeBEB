import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Crown, Eye, Users } from 'lucide-react'

import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { ShareTournamentLink } from '@/components/torneos/share-tournament-link'
import { TournamentAdminPanel } from '@/components/torneos/tournament-admin-panel'
import { TournamentLeaderboard } from '@/components/torneos/tournament-leaderboard'
import { prisma } from '@/lib/prisma'
import { getTournamentById, getTournamentLeaderboard } from '@/lib/queries/tournaments'
import { ensureDbUser } from '@/lib/queries/users'
import { getTournamentJoinUrl } from '@/lib/tournament/join-link'
import { isPrivateTournament } from '@/lib/tournament/predictions-visibility'

interface TournamentPageProps {
  params: Promise<{ id: string }>
}

export default async function TournamentPage({ params }: TournamentPageProps) {
  const { id } = await params
  const user = await ensureDbUser()
  if (!user) redirect('/torneos')

  const tournament = await getTournamentById(id)
  if (!tournament) notFound()

  const membership = await prisma.tournamentMember.findUnique({
    where: { userId_tournamentId: { userId: user.id, tournamentId: tournament.id } },
  })
  if (!membership) redirect('/torneos')

  const members = await getTournamentLeaderboard(tournament.id)
  const isOwner = tournament.createdById === user.id

  const activeModes = [
    tournament.modeMatchday && 'Fecha a Fecha',
    tournament.modeScorers && 'Goleadores',
    tournament.modeComplete && 'Prode Completo',
  ].filter(Boolean) as string[]

  const showGroupPredictions =
    isPrivateTournament(tournament) && tournament.modeMatchday

  return (
    <AppShell pathname="/torneos">
      <Link
        href="/torneos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Mis torneos
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-3xl tracking-wide">{tournament.name}</h1>
            {isOwner && <Crown className="size-5 text-brand-gold" aria-label="Sos el creador" />}
          </div>
          {tournament.description && (
            <p className="mt-1 text-muted-foreground">{tournament.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="size-4" aria-hidden />
              {tournament._count.members}{' '}
              {tournament._count.members === 1 ? 'miembro' : 'miembros'}
            </span>
            <span>{activeModes.join(' · ')}</span>
          </div>
        </div>

        <div className="w-full max-w-xl space-y-3 text-right sm:w-auto">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Código de invitación</p>
            <p className="rounded-md border border-border bg-muted/40 px-3 py-1.5 font-mono text-lg tracking-[0.3em]">
              {tournament.code}
            </p>
          </div>
          <div className="space-y-2 text-left sm:text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Link para invitar</p>
            <ShareTournamentLink
              joinUrl={getTournamentJoinUrl(tournament.code)}
              tournamentName={tournament.name}
            />
          </div>
        </div>
      </div>

      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-xl tracking-wide">TABLA DE POSICIONES</h2>
          {showGroupPredictions ? (
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/torneos/${tournament.id}/predicciones`} />}>
              <Eye className="size-4" aria-hidden />
              Ver predicciones del grupo
            </Button>
          ) : null}
        </div>
        <TournamentLeaderboard
          members={members}
          currentUserId={user.id}
          modeMatchday={tournament.modeMatchday}
          modeScorers={tournament.modeScorers}
          modeComplete={tournament.modeComplete}
        />
      </section>

      {isOwner && (
        <section>
          <TournamentAdminPanel
            tournamentId={tournament.id}
            members={members.map((member) => ({
              id: member.id,
              userId: member.userId,
              user: { name: member.user.name },
            }))}
            currentUserId={user.id}
          />
        </section>
      )}
    </AppShell>
  )
}
