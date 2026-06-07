'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { cn } from '@/lib/utils'
import type { Confederation } from '@/types'

const CONFEDERATIONS: { id: Confederation | 'all'; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'UEFA', label: 'UEFA' },
  { id: 'CONMEBOL', label: 'CONMEBOL' },
  { id: 'CONCACAF', label: 'CONCACAF' },
  { id: 'CAF', label: 'CAF' },
  { id: 'AFC', label: 'AFC' },
  { id: 'OFC', label: 'OFC' },
]

interface ConfederationTabsProps {
  current?: string
  colors: Record<string, { color: string }>
}

export function ConfederationTabs({ current, colors }: ConfederationTabsProps) {
  const searchParams = useSearchParams()
  const active = current ?? searchParams.get('conf') ?? 'all'

  function buildHref(conf: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (conf === 'all') params.delete('conf')
    else params.set('conf', conf)
    const query = params.toString()
    return query ? `/selecciones?${query}` : '/selecciones'
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {CONFEDERATIONS.map(({ id, label }) => {
        const isActive = active === id
        const color = id !== 'all' ? colors[id]?.color : undefined

        return (
          <Link
            key={id}
            href={buildHref(id)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
            )}
            style={isActive && color ? { borderColor: color, color } : undefined}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
