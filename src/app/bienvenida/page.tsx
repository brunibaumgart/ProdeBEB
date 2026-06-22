import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SignInButton, SignUpButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import {
  BarChart3,
  CalendarDays,
  Grid3x3,
  MapPin,
  MessageSquare,
  Sparkles,
  Target,
  Trophy,
  Users,
} from 'lucide-react'

import { AppShell } from '@/components/layout/app-shell'
import { VisitorNoteForm } from '@/components/bienvenida/visitor-note-form'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Bienvenido',
  description: 'Conocé todo lo que podés hacer en ProdeBEB para el Mundial 2026.',
}

const infoLinks = [
  { href: '/fixture', label: 'Fixture', icon: CalendarDays, description: 'Los 104 partidos del Mundial' },
  { href: '/grupos', label: 'Grupos', icon: Grid3x3, description: 'Tablas en vivo de cada grupo' },
  { href: '/estadisticas', label: 'Estadísticas', icon: BarChart3, description: 'Goleadores y números del torneo' },
  { href: '/selecciones', label: 'Selecciones', icon: Users, description: 'Las 48 selecciones y sus planteles' },
  { href: '/estadios', label: 'Estadios', icon: MapPin, description: 'Las 16 sedes del Mundial' },
]

const prodeModes = [
  { label: 'Prode Fecha', description: 'Predecí los resultados jornada a jornada.' },
  { label: 'Prode Completo', description: 'Armá tu llave entera desde fase de grupos hasta la final.' },
  { label: 'Especiales', description: 'Campeón, goleador, mejor jugador y más.' },
  { label: 'Jurado', description: 'Votá las preguntas del jurado y sumá puntos.' },
]

export default async function BienvenidaPage() {
  const { userId } = await auth()
  if (userId) redirect('/')

  return (
    <AppShell pathname="/bienvenida">
      {/* Hero */}
      <section className="mb-12 text-center">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-brand-gold">
          FIFA World Cup 2026
        </p>
        <h1 className="font-heading text-4xl tracking-wide text-foreground sm:text-5xl">
          BIENVENIDO A PRODEBEB
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Seguí el Mundial 2026 en tiempo real, simulá qué tiene que pasar para que clasifique tu
          selección y competí en el prode con tus amigos. Explorá todo libremente — y cuando quieras
          jugar, creá tu cuenta.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <SignUpButton mode="modal">
            <Button size="lg">Crear mi cuenta</Button>
          </SignUpButton>
          <SignInButton mode="modal">
            <Button size="lg" variant="outline">
              Ya tengo cuenta
            </Button>
          </SignInButton>
        </div>
      </section>

      {/* Visualización de información */}
      <section className="mb-12">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="size-5 text-primary" aria-hidden />
          <h2 className="font-heading text-2xl tracking-wide">VISUALIZÁ TODA LA INFO</h2>
        </div>
        <p className="mb-4 max-w-2xl text-muted-foreground">
          Toda la información del Mundial en un solo lugar, sin necesidad de registrarte.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {infoLinks.map(({ href, label, icon: Icon, description }) => (
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

      {/* Simulador */}
      <section className="mb-12">
        <div className="mb-4 flex items-center gap-2">
          <Target className="size-5 text-primary" aria-hidden />
          <h2 className="font-heading text-2xl tracking-wide">SIMULÁ RESULTADOS</h2>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-lg font-medium">¿Qué tiene que pasar para que clasifique tu selección?</p>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Jugá con los resultados de cada grupo y mirá cómo cambian las posiciones y los cruces de
            octavos en tiempo real. Descubrí todos los escenarios posibles antes de que se jueguen
            los partidos.
          </p>
          <Link
            href="/grupos"
            className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Probar el simulador →
          </Link>
        </div>
      </section>

      {/* Prode */}
      <section className="mb-12">
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="size-5 text-primary" aria-hidden />
          <h2 className="font-heading text-2xl tracking-wide">EL PRODE</h2>
        </div>
        <p className="mb-4 max-w-2xl text-muted-foreground">
          Predecí, competí y armá torneos privados con tus amigos. Para jugar al prode necesitás una
          cuenta.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {prodeModes.map(({ label, description }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <p className="font-medium">{label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-brand-gold/30 bg-card p-6">
          <Sparkles className="size-6 shrink-0 text-brand-gold" aria-hidden />
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-medium">¿Listo para jugar? Creá tu cuenta gratis y empezá a competir.</p>
            <SignUpButton mode="modal">
              <Button>Empezar ahora</Button>
            </SignUpButton>
          </div>
        </div>
      </section>

      {/* Notas de visitantes */}
      <section className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="size-5 text-primary" aria-hidden />
          <h2 className="font-heading text-2xl tracking-wide">DEJANOS TU MENSAJE</h2>
        </div>
        <p className="mb-4 text-muted-foreground">
          ¿Llegaste hasta acá? Contanos qué te pareció. Podés dejar tu nombre o hacerlo de forma
          anónima.
        </p>
        <VisitorNoteForm />
      </section>
    </AppShell>
  )
}
