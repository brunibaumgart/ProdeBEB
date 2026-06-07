import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { SignInButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { Trophy, Users } from 'lucide-react'

import { JoinTournamentAction } from '@/components/torneos/join-tournament-action'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { ensureDbUser } from '@/lib/queries/users'
import {
  getTournamentJoinPath,
  getTournamentJoinUrl,
  isValidTournamentJoinCode,
  normalizeTournamentJoinCode,
} from '@/lib/tournament/join-link'
import { GLOBAL_TOURNAMENT_CODE, getTournamentQuotaStatus } from '@/lib/tournament/quotas'

interface JoinTournamentPageProps {
  params: Promise<{ code: string }>
}

export default async function JoinTournamentPage({ params }: JoinTournamentPageProps) {
  const { code } = await params
  const normalizedCode = normalizeTournamentJoinCode(code)

  if (!isValidTournamentJoinCode(normalizedCode)) notFound()

  const tournamentWithMeta = await prisma.tournament.findUnique({
    where: { code: normalizedCode },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { members: true } },
    },
  })

  if (!tournamentWithMeta || tournamentWithMeta.code === GLOBAL_TOURNAMENT_CODE) notFound()

  const activeModes = [
    tournamentWithMeta.modeMatchday && 'Fecha a Fecha',
    tournamentWithMeta.modeScorers && 'Goleadores',
    tournamentWithMeta.modeComplete && 'Prode Completo',
  ].filter(Boolean) as string[]

  const joinPath = getTournamentJoinPath(normalizedCode)
  const joinUrl = getTournamentJoinUrl(normalizedCode)
  const { userId } = await auth()
  const dbUser = userId ? await ensureDbUser() : null

  if (dbUser?.hasChosenUsername) {
    const membership = await prisma.tournamentMember.findUnique({
      where: {
        userId_tournamentId: {
          userId: dbUser.id,
          tournamentId: tournamentWithMeta.id,
        },
      },
    })

    if (membership) redirect(`/torneos/${tournamentWithMeta.id}`)
  }

  const quota = dbUser ? await getTournamentQuotaStatus(dbUser) : null
  const canJoin = Boolean(dbUser?.hasChosenUsername && quota)

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Trophy className="size-6" aria-hidden />
          </span>
          <p className="mt-4 text-sm font-medium uppercase tracking-widest text-brand-gold">
            Invitación a torneo
          </p>
          <h1 className="mt-2 font-heading text-3xl tracking-wide">{tournamentWithMeta.name}</h1>
          {tournamentWithMeta.description ? (
            <p className="mt-2 text-muted-foreground">{tournamentWithMeta.description}</p>
          ) : null}
        </div>

        <div className="mb-6 space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-1.5">
            <Users className="size-4" aria-hidden />
            {tournamentWithMeta._count.members}{' '}
            {tournamentWithMeta._count.members === 1 ? 'miembro' : 'miembros'}
          </p>
          {activeModes.length > 0 ? <p className="text-center">{activeModes.join(' · ')}</p> : null}
          {tournamentWithMeta.createdBy ? (
            <p className="text-center">
              Creado por <span className="text-foreground">{tournamentWithMeta.createdBy.name}</span>
            </p>
          ) : null}
          <p className="text-center font-mono tracking-[0.3em]">{normalizedCode}</p>
        </div>

        {canJoin && quota ? (
          <JoinTournamentAction code={normalizedCode} quota={quota} />
        ) : dbUser && !dbUser.hasChosenUsername ? (
          <div className="flex flex-col items-stretch gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              Antes de unirte, elegí tu nombre de usuario.
            </p>
            <Button render={<Link href="/elegir-usuario" />} size="lg" nativeButton={false}>
              Elegir usuario
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-stretch gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              Iniciá sesión para unirte a este torneo privado.
            </p>
            <SignInButton mode="modal" forceRedirectUrl={joinUrl}>
              <Button size="lg">Ingresar y unirme</Button>
            </SignInButton>
            <Link href="/torneos" className="text-sm text-muted-foreground hover:text-foreground">
              Ver mis torneos
            </Link>
          </div>
        )}
      </div>

      {!userId ? (
        <p className="mt-4 max-w-lg text-center text-xs text-muted-foreground">
          Al ingresar volvés a {joinPath} para completar la unión.
        </p>
      ) : null}
    </div>
  )
}
