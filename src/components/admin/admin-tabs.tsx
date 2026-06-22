'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { cn } from '@/lib/utils'

const TABS = [
  { id: 'partidos', label: 'Partidos' },
  { id: 'finalizados', label: 'Finalizados' },
  { id: 'estadisticas', label: 'Estadísticas' },
  { id: 'predicciones', label: 'Predicciones' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'torneos', label: 'Torneos' },
  { id: 'notificaciones', label: 'Notificaciones' },
  { id: 'visitas', label: 'Visitas' },
  { id: 'testeos', label: 'Testeos' },
] as const

interface AdminTabsProps {
  current: string
}

export function AdminTabs({ current }: AdminTabsProps) {
  const searchParams = useSearchParams()

  function buildHref(tab: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'partidos') params.delete('tab')
    else params.set('tab', tab)
    const query = params.toString()
    return query ? `/admin?${query}` : '/admin'
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Secciones de administración">
      {TABS.map(({ id, label }) => {
        const isActive = current === id
        return (
          <Link
            key={id}
            href={buildHref(id)}
            role="tab"
            aria-selected={isActive}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
            )}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
