'use client'

import { useMemo, useState } from 'react'

import { UserInitialAvatar } from '@/components/ui/user-initial-avatar'
import { cn } from '@/lib/utils'

interface LeaderboardRow {
  id: string
  userId: string
  joinedAt: Date
  pointsMatchday: number
  pointsScorers: number
  pointsComplete: number
  pointsTotal: number
  user: { id: string; name: string }
}

interface TournamentLeaderboardProps {
  members: LeaderboardRow[]
  currentUserId: string | null
  modeMatchday: boolean
  modeScorers: boolean
  modeComplete: boolean
}

type PointsField = 'pointsTotal' | 'pointsMatchday' | 'pointsScorers' | 'pointsComplete'

interface FilterOption {
  key: string
  label: string
  field: PointsField
  columnLabel: string
}

export function TournamentLeaderboard({
  members,
  currentUserId,
  modeMatchday,
  modeScorers,
  modeComplete,
}: TournamentLeaderboardProps) {
  const activeModesCount = [modeMatchday, modeScorers, modeComplete].filter(Boolean).length

  const filters = useMemo<FilterOption[]>(() => {
    const options: FilterOption[] = []
    if (activeModesCount > 1) {
      options.push({ key: 'total', label: 'General', field: 'pointsTotal', columnLabel: 'Total' })
    }
    if (modeMatchday) {
      options.push({
        key: 'matchday',
        label: 'Fecha a Fecha',
        field: 'pointsMatchday',
        columnLabel: 'F a F',
      })
    }
    if (modeScorers) {
      options.push({
        key: 'scorers',
        label: 'Goleadores',
        field: 'pointsScorers',
        columnLabel: 'Goleadores',
      })
    }
    if (modeComplete) {
      options.push({
        key: 'complete',
        label: 'Completo',
        field: 'pointsComplete',
        columnLabel: 'Completo',
      })
    }
    return options
  }, [activeModesCount, modeMatchday, modeScorers, modeComplete])

  const [selectedKey, setSelectedKey] = useState(filters[0]?.key ?? 'total')
  const selected = filters.find((option) => option.key === selectedKey) ?? filters[0]
  const pointsField: PointsField = selected?.field ?? 'pointsTotal'
  const columnLabel = selected?.columnLabel ?? 'Total'

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const diff = b[pointsField] - a[pointsField]
      if (diff !== 0) return diff
      return a.joinedAt.getTime() - b.joinedAt.getTime()
    })
  }, [members, pointsField])

  return (
    <div>
      {filters.length > 1 && (
        <div
          className="mb-3 flex flex-wrap gap-1.5"
          role="tablist"
          aria-label="Filtrar tabla de posiciones"
        >
          {filters.map((option) => (
            <button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={option.key === selectedKey}
              onClick={() => setSelectedKey(option.key)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                option.key === selectedKey
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">#</th>
              <th className="px-4 py-2.5 text-left font-medium">Usuario</th>
              <th className="px-4 py-2.5 text-right font-medium text-primary">{columnLabel}</th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((member, index) => {
              const isMe = member.userId === currentUserId

              return (
                <tr
                  key={member.id}
                  className={cn(
                    'border-b border-border/40 last:border-0',
                    isMe && 'bg-primary/10'
                  )}
                >
                  <td className="px-4 py-2.5 font-heading text-base tabular-nums">
                    {index + 1}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <UserInitialAvatar name={member.user.name} size="sm" />
                      <span className={cn('font-medium', isMe && 'text-primary')}>
                        {member.user.name}
                        {isMe && (
                          <span className="ml-1.5 text-xs text-muted-foreground">(vos)</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-heading text-base tabular-nums text-primary">
                    {member[pointsField]}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
