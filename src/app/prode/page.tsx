import Link from 'next/link'
import { ArrowRight, CalendarRange, ShieldCheck, Sparkles, Trophy, UsersRound } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'

import { AppShell } from '@/components/layout/app-shell'
import { ProdePointsOverview } from '@/components/prode/prode-points-overview'
import { TodayMatches } from '@/components/prode/today-matches'
import { canAccessTestContent, isAdminClerkId } from '@/lib/auth/test-access'
import { isBracketGloballyLocked } from '@/lib/bracket/lock'
import { getBracketEntryForUser } from '@/lib/queries/bracket'
import { getTodayMatches } from '@/lib/queries/matches'
import { WORLD_CUP_AWARDS } from '@/lib/awards/world-cup-awards'
import { areWorldCupAwardsLocked, getWorldCupAwardsLockAt } from '@/lib/awards/lock'
import { JURY_CATEGORIES } from '@/lib/jury/jury-categories'
import { getUserAwardPredictionsMap } from '@/lib/queries/awards'
import { getUserJuryPredictionsMap } from '@/lib/queries/jury'
import { getUserPredictionsForMatchIds } from '@/lib/queries/predictions'
import { ensureDbUser, getUserProfileStats } from '@/lib/queries/users'
import { getArgentinaTodayBounds } from '@/lib/time'
import { cn } from '@/lib/utils'

export default async function ProdePage() {
  const { userId: clerkId } = await auth()
  const includeTestMatches = await canAccessTestContent(clerkId)
  const isAdmin = isAdminClerkId(clerkId)
  const user = await ensureDbUser()
  const { gte, lte } = getArgentinaTodayBounds()

  const [stats, bracketEntry, todayMatches, awardPredictionsMap, juryPredictionsMap, awardsLockAt] =
    await Promise.all([
    user ? getUserProfileStats(user.id, { includeFriendly: includeTestMatches }) : null,
    user ? getBracketEntryForUser(user.id) : null,
    getTodayMatches(gte, lte, { includeTestMatches }),
    user ? getUserAwardPredictionsMap(user.id) : Promise.resolve(new Map()),
    user ? getUserJuryPredictionsMap(user.id) : Promise.resolve(new Map()),
    getWorldCupAwardsLockAt(),
  ])

  const predictionsByMatchId = user
    ? await getUserPredictionsForMatchIds(
        user.id,
        todayMatches.map((match) => match.id)
      )
    : new Map()
  const bracketLocked = isBracketGloballyLocked()
  const bracketInProgress = bracketEntry != null && !bracketEntry.locked

  const completoStatus = bracketLocked
    ? 'Cerrado'
    : bracketEntry?.locked
      ? 'Confirmado (editable)'
      : bracketInProgress
        ? 'En progreso'
        : 'Disponible'

  const completoStatusClass = bracketLocked
    ? 'text-muted-foreground'
    : bracketEntry?.locked
      ? 'text-brand-green'
      : bracketInProgress
        ? 'text-brand-gold'
        : 'text-brand-green'

  const awardsLocked = areWorldCupAwardsLocked(awardsLockAt)
  const awardsCompleted = WORLD_CUP_AWARDS.filter((award) =>
    awardPredictionsMap.has(award.id),
  ).length
  const awardsStatus = awardsLocked
    ? awardsCompleted === WORLD_CUP_AWARDS.length
      ? 'Completo'
      : 'Cerrado'
    : awardsCompleted === WORLD_CUP_AWARDS.length
      ? 'Completo'
      : awardsCompleted > 0
        ? 'En progreso'
        : 'Disponible'
  const awardsStatusClass = awardsLocked
    ? 'text-muted-foreground'
    : awardsCompleted === WORLD_CUP_AWARDS.length
      ? 'text-brand-green'
      : awardsCompleted > 0
        ? 'text-brand-gold'
        : 'text-brand-green'

  const juryLocked = areWorldCupAwardsLocked(awardsLockAt)
  const juryCompleted = JURY_CATEGORIES.filter((category) =>
    juryPredictionsMap.has(category.id),
  ).length
  const juryStatus = juryLocked
    ? juryCompleted === JURY_CATEGORIES.length
      ? 'Completo'
      : 'Cerrado'
    : juryCompleted === JURY_CATEGORIES.length
      ? 'Completo'
      : juryCompleted > 0
        ? 'En progreso'
        : 'Disponible'
  const juryStatusClass = juryLocked
    ? 'text-muted-foreground'
    : juryCompleted === JURY_CATEGORIES.length
      ? 'text-brand-green'
      : juryCompleted > 0
        ? 'text-brand-gold'
        : 'text-brand-green'

  const modes = [
    {
      href: '/prode/fecha',
      title: 'Fecha a Fecha',
      description: 'Predecí el resultado de cada partido antes del kick-off.',
      status: 'Disponible',
      statusClass: 'text-brand-green',
      icon: CalendarRange,
    },
    {
      href: '/prode/completo',
      title: 'Prode Completo',
      description: 'Grupos (victoria/empate), eliminatorias y campeón.',
      status: completoStatus,
      statusClass: completoStatusClass,
      icon: Trophy,
    },
    {
      href: '/prode/especiales',
      title: 'Especiales del Mundial',
      description: 'Predecí Bota de Oro, Balón de Oro, Fair Play y otras distinciones FIFA.',
      status: awardsStatus,
      statusClass: awardsStatusClass,
      icon: Sparkles,
    },
    {
      href: '/prode/jurado',
      title: 'Prode del Jurado',
      description:
        'Selección revelación, decepción y otras categorías subjetivas. Los puntos los define el jurado.',
      status: juryStatus,
      statusClass: juryStatusClass,
      icon: UsersRound,
    },
  ]

  return (
    <AppShell pathname="/prode">
      <div className="mb-8">
        <h1 className="font-heading text-3xl tracking-wide">PRODE</h1>
        <p className="mt-2 text-muted-foreground">
          Elegí un modo y empezá a sumar puntos en el torneo global.
        </p>
      </div>

      {isAdmin && (
        <Link
          href="/admin"
          className="mb-8 flex items-center justify-between gap-3 rounded-xl border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 transition-colors hover:border-brand-gold/60"
        >
          <span className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-brand-gold/20 text-brand-gold">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-medium">Panel Admin</span>
              <span className="text-sm text-muted-foreground">
                Cargá resultados, goleadores y gestioná testers
              </span>
            </span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-brand-gold" aria-hidden />
        </Link>
      )}

      {stats && (
        <ProdePointsOverview
          pointsMatchday={stats.pointsMatchday}
          pointsScorers={stats.pointsScorers}
          pointsComplete={stats.pointsComplete}
          pointsTotal={stats.pointsTotal}
          pointsFriendly={stats.pointsFriendly}
          showFriendly={includeTestMatches}
        />
      )}

      <section className="mb-8 grid grid-cols-2 gap-4">
        {modes.map((mode) => {
          const Icon = mode.icon
          const modeKey = mode.href
          const content = (
            <article
              className={cn(
                'flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40',
              )}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className={cn('text-xs font-bold uppercase tracking-wide', mode.statusClass)}>
                  {mode.status}
                </span>
              </div>
              <h2 className="font-heading text-xl tracking-wide sm:text-2xl">{mode.title}</h2>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{mode.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Jugar ahora
                <ArrowRight className="size-4" aria-hidden />
              </span>
            </article>
          )

          return (
            <Link key={modeKey} href={mode.href} className="block">
              {content}
            </Link>
          )
        })}
      </section>

      <section>
        <h2 className="mb-4 font-heading text-xl tracking-wide">PARTIDOS DE HOY</h2>
        <TodayMatches matches={todayMatches} predictionsByMatchId={predictionsByMatchId} />
      </section>
    </AppShell>
  )
}
