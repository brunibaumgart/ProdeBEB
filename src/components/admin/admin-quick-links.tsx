import Link from 'next/link'
import { CalendarRange, ClipboardList, Pencil, ShieldCheck, Trophy, Users } from 'lucide-react'

import { cn } from '@/lib/utils'

const links = [
  {
    href: '/admin',
    label: 'Cargar resultados',
    description: 'Partidos en vivo y pendientes',
    icon: ShieldCheck,
    highlight: true,
  },
  {
    href: '/prode/fecha',
    label: 'Fecha a Fecha',
    description: 'Ver amistosos y predicciones',
    icon: CalendarRange,
  },
  {
    href: '/prode',
    label: 'Hub Prode',
    description: 'Puntos y partidos de hoy',
    icon: Trophy,
  },
  {
    href: '/admin?tab=finalizados',
    label: 'Finalizados',
    description: 'Corregir resultados cargados',
    icon: Pencil,
  },
  {
    href: '/admin?tab=estadisticas',
    label: 'Estadísticas',
    description: 'Goleadores y rankings del Mundial',
    icon: Trophy,
  },
  {
    href: '/admin?tab=predicciones',
    label: 'Predicciones',
    description: 'Ver predicciones de usuarios',
    icon: ClipboardList,
  },
  {
    href: '/admin?tab=usuarios',
    label: 'Testers',
    description: 'Usuarios invitados',
    icon: Users,
  },
] as const

export function AdminQuickLinks({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
        className
      )}
    >
      {links.map((link) => {
        const { href, label, description, icon: Icon } = link
        const highlight = 'highlight' in link && link.highlight

        return (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex items-start gap-3 rounded-xl border p-4 transition-colors',
            highlight
              ? 'border-brand-gold/40 bg-brand-gold/10 hover:border-brand-gold/60'
              : 'border-border bg-card hover:border-primary/40'
          )}
        >
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-lg',
              highlight ? 'bg-brand-gold/20 text-brand-gold' : 'bg-primary/15 text-primary'
            )}
          >
            <Icon className="size-5" aria-hidden />
          </span>
          <span>
            <span className="block font-medium">{label}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
          </span>
        </Link>
        )
      })}
    </section>
  )
}
