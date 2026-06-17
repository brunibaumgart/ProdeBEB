import { AppShell } from '@/components/layout/app-shell'
import { AdminMatchForm } from '@/components/admin/admin-match-form'
import { AdminMatchRow } from '@/components/admin/admin-match-row'
import { AdminPredictionsPanel } from '@/components/admin/admin-predictions-panel'
import { AdminPushNotificationsPanel } from '@/components/admin/admin-push-notifications-panel'
import { AdminScoringAdjustmentPanel } from '@/components/admin/admin-scoring-adjustment-panel'
import { AdminQuickLinks } from '@/components/admin/admin-quick-links'
import { AdminTabs } from '@/components/admin/admin-tabs'
import { AdminTesteosPanel } from '@/components/admin/admin-testeos-panel'
import { AdminUsersPanel } from '@/components/admin/admin-users-panel'
import { AdminWorldCupStats } from '@/components/admin/admin-world-cup-stats'
import {
  getAdminMatchesForPredictions,
  getAdminMatchPredictions,
  getAdminMatchesOverview,
  getAdminPredictionsByMatchIds,
  getAdminTournaments,
  getAdminUserPredictions,
  getAdminPushNotificationOverview,
  getAdminUsers,
  getMatchGoalsByMatchIds,
  getMatchStatistics,
} from '@/lib/queries/admin'
import { formatScorerSlotLabel, scorerSlotToId } from '@/lib/scoring/scorers'
import { prisma } from '@/lib/prisma'
import { getPlayersByTeamIds } from '@/lib/queries/teams'
import { formatArgentinaDate } from '@/lib/time'
import { cn } from '@/lib/utils'
import { isPlatformAdmin } from '@/lib/auth/test-access'
import { getWorldCupStatistics } from '@/lib/queries/world-cup-stats'
import { ensureDbUser } from '@/lib/queries/users'

interface AdminPageProps {
  searchParams: Promise<{ tab?: string; matchId?: string; userId?: string }>
}

import type { MatchWithRelations } from '@/lib/queries/matches'

const TAB_IDS = ['partidos', 'finalizados', 'estadisticas', 'predicciones', 'usuarios', 'torneos', 'notificaciones', 'testeos']

function toFormMatch(match: MatchWithRelations) {
  return {
    id: match.id,
    date: match.date.toISOString(),
    timeArg: match.timeArg,
    status: match.status,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    venue: match.venue,
    isTest: match.isTest,
    kickoffPushNotifiedAt: match.kickoffPushNotifiedAt?.toISOString() ?? null,
  }
}

async function PartidosTab() {
  const overview = await getAdminMatchesOverview()

  const inProgressMatches = [...overview.live, ...overview.readyForResult]

  const teamIds = [
    ...new Set(
      inProgressMatches.flatMap((match) =>
        [match.homeTeamId, match.awayTeamId].filter(Boolean),
      ),
    ),
  ] as string[]

  const [players, matchGoalsByMatchId] = await Promise.all([
    getPlayersByTeamIds(teamIds),
    getMatchGoalsByMatchIds(inProgressMatches.map((match) => match.id)),
  ])

  const playersByTeamId = new Map<string, { id: string; name: string; position: string }[]>()
  for (const player of players) {
    const list = playersByTeamId.get(player.teamId) ?? []
    list.push({ id: player.id, name: player.name, position: player.position })
    playersByTeamId.set(player.teamId, list)
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-1 font-heading text-xl tracking-wide">EN JUEGO</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Si el aviso automático no llegó, usá &quot;Avisar que el partido ha comenzado&quot;. Actualizá el
          marcador parcial y finalizá solo cuando termine.
        </p>
        {inProgressMatches.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            No hay partidos en juego por ahora.
          </p>
        ) : (
          <div className="space-y-4">
            {inProgressMatches.map((match) => {
              const goals = matchGoalsByMatchId.get(match.id) ?? { home: [], away: [] }

              return (
                <AdminMatchForm
                  key={match.id}
                  mode="live"
                  match={toFormMatch(match)}
                  initialHomeScore={match.homeScore}
                  initialAwayScore={match.awayScore}
                  initialHomeScorers={goals.home}
                  initialAwayScorers={goals.away}
                  homePlayers={
                    match.homeTeamId ? (playersByTeamId.get(match.homeTeamId) ?? []) : []
                  }
                  awayPlayers={
                    match.awayTeamId ? (playersByTeamId.get(match.awayTeamId) ?? []) : []
                  }
                />
              )
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <div>
            <h2 className="font-heading text-xl tracking-wide">PRÓXIMOS</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A la hora del partido se marca en juego solo. Podés adelantarlo manualmente si hace falta.
            </p>
          </div>
          {overview.upcomingTotal > overview.upcoming.length && (
            <span className="text-xs text-muted-foreground">
              Mostrando {overview.upcoming.length} de {overview.upcomingTotal}
            </span>
          )}
        </div>
        {overview.upcoming.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            No hay próximos partidos cargados.
          </p>
        ) : (
          <div className="space-y-3">
            {overview.upcoming.map((match) => (
              <AdminMatchRow key={match.id} match={toFormMatch(match)} action="notify-kickoff" />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

async function FinalizadosTab() {
  const overview = await getAdminMatchesOverview()

  const teamIds = [
    ...new Set(
      overview.finished.flatMap((match) =>
        [match.homeTeamId, match.awayTeamId].filter(Boolean)
      )
    ),
  ] as string[]

  const [players, matchGoalsByMatchId, finishedStats, predictionsByMatchId] = await Promise.all([
    getPlayersByTeamIds(teamIds),
    getMatchGoalsByMatchIds(overview.finished.map((match) => match.id)),
    Promise.all(overview.finished.map((match) => getMatchStatistics(match.id))),
    getAdminPredictionsByMatchIds(overview.finished.map((match) => match.id)),
  ])

  const playersByTeamId = new Map<string, { id: string; name: string; position: string }[]>()
  for (const player of players) {
    const list = playersByTeamId.get(player.teamId) ?? []
    list.push({ id: player.id, name: player.name, position: player.position })
    playersByTeamId.set(player.teamId, list)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Editá marcador o goleadores; los puntos se recalculan al guardar.
        </p>
        {overview.finishedTotal > overview.finished.length && (
          <span className="text-xs text-muted-foreground">
            Mostrando {overview.finished.length} de {overview.finishedTotal}
          </span>
        )}
      </div>

      {overview.finished.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
          Todavía no hay partidos finalizados.
        </p>
      ) : (
        <div className="space-y-4">
          {overview.finished.map((match, index) => {
            const goals = matchGoalsByMatchId.get(match.id) ?? { home: [], away: [] }
            const stats = finishedStats[index]

            return (
              <div key={match.id} className="space-y-2">
                <AdminMatchForm
                  mode="edit"
                  match={toFormMatch(match)}
                  initialHomeScore={match.homeScore}
                  initialAwayScore={match.awayScore}
                  initialHomeScorers={goals.home}
                  initialAwayScorers={goals.away}
                  homePlayers={
                    match.homeTeamId ? (playersByTeamId.get(match.homeTeamId) ?? []) : []
                  }
                  awayPlayers={
                    match.awayTeamId ? (playersByTeamId.get(match.awayTeamId) ?? []) : []
                  }
                />
                <AdminMatchRow
                  match={toFormMatch(match)}
                  stats={stats}
                  predictions={predictionsByMatchId.get(match.id)}
                  action="recalculate"
                  showHeader={false}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

async function EstadisticasTab() {
  const stats = await getWorldCupStatistics()
  return <AdminWorldCupStats stats={stats} />
}

async function PrediccionesTab({
  matchIdParam,
  userIdParam,
}: {
  matchIdParam?: string
  userIdParam?: string
}) {
  const [matches, selectedUser, userPredictionsRaw] = await Promise.all([
    getAdminMatchesForPredictions(),
    userIdParam
      ? prisma.user.findUnique({
          where: { id: userIdParam },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve(null),
    userIdParam ? getAdminUserPredictions(userIdParam) : Promise.resolve([]),
  ])

  const selectedMatchId =
    matchIdParam != null && matches.some((match) => match.id === Number(matchIdParam))
      ? Number(matchIdParam)
      : matches[0]?.id ?? null

  const selectedMatchPredictions =
    selectedMatchId != null && !userIdParam
      ? await getAdminMatchPredictions(selectedMatchId)
      : []

  const userPredictions = userPredictionsRaw.map((prediction) => ({
    id: prediction.id,
    predHome: prediction.predHome,
    predAway: prediction.predAway,
    points: prediction.points,
    pointsScorers: prediction.pointsScorers,
    scorerNames: prediction.scorers.map((scorer) =>
      formatScorerSlotLabel(scorerSlotToId(scorer), scorer.player?.name),
    ),
    match: {
      id: prediction.match.id,
      date: prediction.match.date.toISOString(),
      timeArg: prediction.match.timeArg,
      status: prediction.match.status,
      homeScore: prediction.match.homeScore,
      awayScore: prediction.match.awayScore,
      homeTeam: prediction.match.homeTeam,
      awayTeam: prediction.match.awayTeam,
    },
  }))

  return (
    <AdminPredictionsPanel
      matches={matches.map((match) => ({
        id: match.id,
        date: match.date.toISOString(),
        timeArg: match.timeArg,
        status: match.status,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        predictionCount: match._count.predictions,
      }))}
      selectedMatchId={selectedMatchId}
      selectedMatchPredictions={selectedMatchPredictions}
      selectedUser={selectedUser}
      userPredictions={userPredictions}
    />
  )
}

async function UsuariosTab() {
  const rawUsers = await getAdminUsers()
  const users = rawUsers.map(({ clerkId, ...user }) => ({
    ...user,
    isAdmin: isPlatformAdmin({ clerkId, isAdmin: user.isAdmin }),
    isTester: user.isTester && !isPlatformAdmin({ clerkId, isAdmin: user.isAdmin }),
  }))
  return <AdminUsersPanel users={users} />
}

async function NotificacionesTab() {
  const rawUsers = await getAdminPushNotificationOverview()

  const users = rawUsers.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    pushRemindersEnabled: user.pushRemindersEnabled,
    pushKickoffEnabled: user.pushKickoffEnabled,
    pushSurpriseEnabled: user.pushSurpriseEnabled,
    pushSetupPromptSeenAt: user.pushSetupPromptSeenAt,
    subscriptionCount: user._count.pushSubscriptions,
    lastSubscriptionAt: user.pushSubscriptions[0]?.updatedAt ?? null,
  }))

  return (
    <div className="space-y-6">
      <AdminScoringAdjustmentPanel />
      <AdminPushNotificationsPanel users={users} />
    </div>
  )
}

async function TesteosTab() {
  const dbUser = await ensureDbUser()
  if (!dbUser) {
    return <p className="text-muted-foreground">No se pudo cargar tu usuario.</p>
  }

  const pushSubscriptionCount = await prisma.pushSubscription.count({
    where: { userId: dbUser.id },
  })

  return (
    <AdminTesteosPanel
      pushRemindersEnabled={dbUser.pushRemindersEnabled}
      pushSubscriptionCount={pushSubscriptionCount}
    />
  )
}

async function TorneosTab() {
  const tournaments = await getAdminTournaments()

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2.5 text-left font-medium">Torneo</th>
            <th className="px-4 py-2.5 text-left font-medium">Código</th>
            <th className="px-4 py-2.5 text-left font-medium">Creador</th>
            <th className="px-4 py-2.5 text-left font-medium">Modos</th>
            <th className="px-4 py-2.5 text-right font-medium">Miembros</th>
            <th className="px-4 py-2.5 text-left font-medium">Creado</th>
          </tr>
        </thead>
        <tbody>
          {tournaments.map((tournament) => {
            const modes = [
              tournament.modeMatchday && 'Fecha a Fecha',
              tournament.modeComplete && 'Completo',
              tournament.modeScorers && 'Goleadores',
            ].filter(Boolean) as string[]

            return (
              <tr key={tournament.id} className="border-b border-border/40 last:border-0">
                <td className="px-4 py-2.5 font-medium">{tournament.name}</td>
                <td className={cn('px-4 py-2.5 font-mono text-xs', tournament.isPublic && 'text-brand-green')}>
                  {tournament.code}
                  {tournament.isPublic && <span className="ml-1.5 text-muted-foreground">(pública)</span>}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{tournament.createdBy?.name ?? '—'}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{modes.join(' · ') || '—'}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{tournament._count.members}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{formatArgentinaDate(tournament.createdAt)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams
  const tab = TAB_IDS.includes(params.tab ?? '') ? (params.tab as string) : 'partidos'

  return (
    <AppShell pathname="/admin">
      <div className="mb-6">
        <h1 className="font-heading text-3xl tracking-wide">ADMIN</h1>
        <p className="mt-2 text-muted-foreground">
          Gestioná partidos, usuarios y torneos. Cargá resultados y goleadores: se calculan puntos y
          avanzan equipos en el bracket automáticamente.
        </p>
      </div>

      <div className="mb-6">
        <AdminQuickLinks className="mb-6" />
        <AdminTabs current={tab} />
      </div>

      {tab === 'estadisticas' ? (
        <EstadisticasTab />
      ) : tab === 'finalizados' ? (
        <FinalizadosTab />
      ) : tab === 'predicciones' ? (
        <PrediccionesTab matchIdParam={params.matchId} userIdParam={params.userId} />
      ) : tab === 'usuarios' ? (
        <UsuariosTab />
      ) : tab === 'torneos' ? (
        <TorneosTab />
      ) : tab === 'notificaciones' ? (
        <NotificacionesTab />
      ) : tab === 'testeos' ? (
        <TesteosTab />
      ) : (
        <PartidosTab />
      )}
    </AppShell>
  )
}
