import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { AppShell } from '@/components/layout/app-shell'
import { TournamentPredictionsView } from '@/components/torneos/tournament-predictions-view'
import { getTournamentById } from '@/lib/queries/tournaments'
import { getTournamentPredictionsOverview } from '@/lib/queries/tournament-predictions'
import { ensureDbUser } from '@/lib/queries/users'
import { isPrivateTournament } from '@/lib/tournament/predictions-visibility'

interface TournamentPredictionsPageProps {
  params: Promise<{ id: string }>
}

export default async function TournamentPredictionsPage({ params }: TournamentPredictionsPageProps) {
  const { id } = await params
  const user = await ensureDbUser()
  if (!user) redirect('/torneos')

  const tournament = await getTournamentById(id)
  if (!tournament || !isPrivateTournament(tournament)) notFound()

  const overview = await getTournamentPredictionsOverview(id, user.id)
  if (!overview) redirect(`/torneos/${id}`)

  return (
    <AppShell pathname="/torneos">
      <Link
        href={`/torneos/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver al torneo
      </Link>

      <div className="mb-6">
        <h1 className="font-heading text-3xl tracking-wide">PREDICCIONES DEL GRUPO</h1>
        <p className="mt-2 text-muted-foreground">{overview.tournamentName}</p>
      </div>

      <TournamentPredictionsView currentUserId={user.id} matches={overview.matches} />
    </AppShell>
  )
}
