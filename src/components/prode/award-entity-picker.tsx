'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import { PositionBadge } from '@/components/ui-mundial/position-badge'
import type { AwardPlayerOption, AwardTeamOption } from '@/lib/queries/awards'
import { cn } from '@/lib/utils'
import type { Position } from '@/types'

interface AwardEntityPickerProps {
  pickType: 'player' | 'team'
  players: AwardPlayerOption[]
  teams: AwardTeamOption[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  playerFilter?: 'any' | 'goalkeeper'
  placeholder?: string
}

export function AwardEntityPicker({
  pickType,
  players,
  teams,
  value,
  onChange,
  disabled = false,
  playerFilter = 'any',
  placeholder = 'Buscar…',
}: AwardEntityPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filteredPlayers = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return players.filter((player) => {
      if (playerFilter === 'goalkeeper' && player.position !== 'Portero') return false
      if (!normalized) return true
      return (
        player.name.toLowerCase().includes(normalized) ||
        player.teamNameEs.toLowerCase().includes(normalized)
      )
    })
  }, [playerFilter, players, query])

  const filteredTeams = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return teams
    return teams.filter((team) => team.nameEs.toLowerCase().includes(normalized))
  }, [query, teams])

  const selectedPlayer = players.find((player) => player.id === value)
  const selectedTeam = teams.find((team) => team.id === value)

  function handleSelect(nextValue: string) {
    onChange(nextValue)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-left text-sm transition-colors',
          'hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className="min-w-0 truncate">
          {pickType === 'player' && selectedPlayer ? (
            <span className="inline-flex items-center gap-2">
              <FlagIcon iso2={selectedPlayer.iso2} flagEmoji={selectedPlayer.flagEmoji} size="sm" />
              {selectedPlayer.name}
              <span className="text-muted-foreground">· {selectedPlayer.teamNameEs}</span>
            </span>
          ) : pickType === 'team' && selectedTeam ? (
            <span className="inline-flex items-center gap-2">
              <FlagIcon iso2={selectedTeam.iso2} flagEmoji={selectedTeam.flagEmoji} size="sm" />
              {selectedTeam.nameEs}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      {open && !disabled ? (
        <>
          <button
            type="button"
            aria-label="Cerrar selector"
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
            <div className="border-b border-border/60 p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={placeholder}
                  className="h-8 w-full rounded-md border border-input bg-transparent pl-8 pr-2 text-sm outline-none focus-visible:border-ring"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              {pickType === 'player' ? (
                filteredPlayers.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                    No hay jugadores que coincidan.
                  </p>
                ) : (
                  filteredPlayers.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => handleSelect(player.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/60',
                        value === player.id && 'bg-primary/10',
                      )}
                    >
                      <FlagIcon iso2={player.iso2} flagEmoji={player.flagEmoji} size="sm" />
                      <span className="min-w-0 flex-1 truncate">{player.name}</span>
                      <PositionBadge position={player.position as Position} />
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {player.teamNameEs}
                      </span>
                      {value === player.id ? <Check className="size-4 text-primary" /> : null}
                    </button>
                  ))
                )
              ) : filteredTeams.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No hay selecciones que coincidan.
                </p>
              ) : (
                filteredTeams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => handleSelect(team.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/60',
                      value === team.id && 'bg-primary/10',
                    )}
                  >
                    <FlagIcon iso2={team.iso2} flagEmoji={team.flagEmoji} size="sm" />
                    <span className="flex-1">{team.nameEs}</span>
                    {value === team.id ? <Check className="size-4 text-primary" /> : null}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
