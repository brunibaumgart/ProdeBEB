import Link from 'next/link'
import { BarChart3, CalendarDays, Grid3x3, MapPin, Users } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'

import { AppShell } from '@/components/layout/app-shell'
import { CountdownTimer, MatchCard } from '@/components/ui-mundial'
import { canAccessTestContent } from '@/lib/auth/test-access'
import {
  getNextMatch,
  getRecentFinishedMatches,
  getTodayMatches,
  getUpcomingMatches,
} from '@/lib/queries/matches'
import { getArgentinaTodayBounds, isWithinTwoHours } from '@/lib/time'

export default async function HomePage() {
  const { userId: clerkId } = await auth()
  const includeTestMatches = await canAccessTestContent(clerkId)
  const { gte, lte } = getArgentinaTodayBounds()

  const [todayMatches, nextMatch, upcoming, recent] = await Promise.all([
    getTodayMatches(gte, lte, { includeTestMatches }),
    getNextMatch({ includeTestMatches }),
    getUpcomingMatches(3, { includeTestMatches }),
    getRecentFinishedMatches(3, { includeTestMatches }),
  ])

  let featuredMatches = todayMatches.slice(0, 3)
  let sectionTitle = 'PARTIDOS DE HOY'

  if (featuredMatches.length === 0) {
    if (upcoming.length > 0) {
      featuredMatches = upcoming
      sectionTitle = 'PRÓXIMOS PARTIDOS'
    } else {
      featuredMatches = recent
      sectionTitle = 'ÚLTIMOS RESULTADOS'
    }
  }

  const showMatchCountdown = nextMatch && isWithinTwoHours(nextMatch.date)
  const countdownTarget = showMatchCountdown ? nextMatch.date : null

  const quickLinks = [
    { href: '/fixture', label: 'Fixture', icon: CalendarDays, description: '104 partidos' },
    { href: '/grupos', label: 'Grupos', icon: Grid3x3, description: '12 grupos' },
    { href: '/estadisticas', label: 'Estadísticas', icon: BarChart3, description: 'Goleadores' },
    { href: '/selecciones', label: 'Selecciones', icon: Users, description: '48 equipos' },
    { href: '/estadios', label: 'Estadios', icon: MapPin, description: '16 sedes' },
  ]

  return (
    <AppShell pathname="/">
      <section className="mb-10 text-center">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-brand-gold">
          FIFA World Cup 2026
        </p>
        <h1 className="font-heading text-4xl tracking-wide text-foreground sm:text-5xl">
          PRODEBEB
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Predecí, competí y seguí el Mundial 2026 en tiempo real.
        </p>
      </section>

      {countdownTarget && (
        <section className="mb-10 rounded-2xl border border-brand-gold/30 bg-card p-6">
          <CountdownTimer
            targetDate={countdownTarget}
            label={
              nextMatch?.homeTeam && nextMatch?.awayTeam
                ? `${nextMatch.homeTeam.nameEs} vs ${nextMatch.awayTeam.nameEs}`
                : 'Próximo partido'
            }
          />
        </section>
      )}

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-2xl tracking-wide">{sectionTitle}</h2>
          <Link href="/fixture" className="text-sm font-medium text-primary hover:underline">
            Ver todos
          </Link>
        </div>
        {featuredMatches.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredMatches.map((match) => (
              <MatchCard key={match.id} match={match} href={`/fixture/${match.id}`} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            No hay partidos para mostrar.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-heading text-2xl tracking-wide">EXPLORAR</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map(({ href, label, icon: Icon, description }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-medium">{label}</span>
                <span className="text-sm text-muted-foreground">{description}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  )
}
