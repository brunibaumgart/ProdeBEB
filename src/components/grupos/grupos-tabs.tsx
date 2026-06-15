'use client'

import Link from 'next/link'
import { FlaskConical, Grid3x3 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

import { cn } from '@/lib/utils'

const TABS = [
  { id: 'oficial', label: 'Oficial', icon: Grid3x3 },
  { id: 'simulador', label: 'Simulador', icon: FlaskConical },
] as const

interface GruposTabsProps {
  current: 'oficial' | 'simulador'
}

export function GruposTabs({ current }: GruposTabsProps) {
  const searchParams = useSearchParams()

  function buildHref(tab: 'oficial' | 'simulador') {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'oficial') params.delete('tab')
    else params.set('tab', tab)
    const query = params.toString()
    return query ? `/grupos?${query}` : '/grupos'
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Vistas de grupos">
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = current === id
        return (
          <Link
            key={id}
            href={buildHref(id)}
            role="tab"
            aria-selected={isActive}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        )
      })}
    </div>
  )
}
