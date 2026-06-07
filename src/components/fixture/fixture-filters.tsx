'use client'

import { useRouter, useSearchParams } from 'next/navigation'

import { cn } from '@/lib/utils'
import { ROUND_LABELS, type MatchRound } from '@/types'

interface FixtureFiltersProps {
  groups: string[]
  teams: { id: string; nameEs: string }[]
  current: {
    grupo?: string
    fase?: string
    equipo?: string
  }
}

const ROUNDS = Object.keys(ROUND_LABELS) as MatchRound[]

export function FixtureFilters({ groups, teams, current }: FixtureFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/fixture?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end">
      <label className="flex min-w-[120px] flex-1 flex-col gap-1.5 text-sm">
        <span className="font-medium text-muted-foreground">Grupo</span>
        <select
          value={current.grupo ?? ''}
          onChange={(event) => updateFilter('grupo', event.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <option value="">Todos</option>
          {groups.map((group) => (
            <option key={group} value={group}>
              Grupo {group}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-[160px] flex-1 flex-col gap-1.5 text-sm">
        <span className="font-medium text-muted-foreground">Fase</span>
        <select
          value={current.fase ?? ''}
          onChange={(event) => updateFilter('fase', event.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <option value="">Todas</option>
          {ROUNDS.map((round) => (
            <option key={round} value={round}>
              {ROUND_LABELS[round]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-[180px] flex-[2] flex-col gap-1.5 text-sm">
        <span className="font-medium text-muted-foreground">Selección</span>
        <select
          value={current.equipo ?? ''}
          onChange={(event) => updateFilter('equipo', event.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <option value="">Todas</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.nameEs}
            </option>
          ))}
        </select>
      </label>

      {(current.grupo || current.fase || current.equipo) && (
        <button
          type="button"
          onClick={() => router.push('/fixture')}
          className={cn(
            'h-9 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
          )}
        >
          Limpiar
        </button>
      )}
    </div>
  )
}
