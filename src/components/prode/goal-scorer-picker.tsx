'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

import { PositionBadge } from '@/components/ui-mundial/position-badge'
import { SCORER_POINTS_BY_POSITION, sortPlayersForScorerPicker } from '@/lib/scoring/scorers'
import { cn } from '@/lib/utils'
import type { Position } from '@/types'

export type GoalScorerPlayer = {
  id: string
  name: string
  position: string
}

type DropdownPosition = {
  top: number
  left: number
  width: number
  maxHeight: number
  placement: 'above' | 'below'
}

interface PlayerSelectProps {
  value: string
  players: GoalScorerPlayer[]
  onChange: (playerId: string) => void
  disabled?: boolean
  align?: 'left' | 'right'
  slotLabel: string
}

function PlayerSelect({
  value,
  players,
  onChange,
  disabled = false,
  align = 'left',
  slotLabel,
}: PlayerSelectProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState<DropdownPosition | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const selected = players.find((player) => player.id === value)

  useEffect(() => {
    setMounted(true)
  }, [])

  function updatePosition() {
    const button = buttonRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const width = Math.max(rect.width, 192)
    const spaceBelow = window.innerHeight - rect.bottom - 12
    const spaceAbove = rect.top - 12
    const preferredMax = 240
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow
    const maxHeight = Math.min(preferredMax, openUp ? spaceAbove : spaceBelow)

    let left = align === 'right' ? rect.right - width : rect.left
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8))

    setPosition({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left,
      width,
      maxHeight: Math.max(maxHeight, 120),
      placement: openUp ? 'above' : 'below',
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()

    function handleReposition() {
      updatePosition()
    }

    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    return () => {
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [open, align])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (
        containerRef.current?.contains(target) ||
        listRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  const dropdown =
    open && position && mounted
      ? createPortal(
          <div
            ref={listRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              transform: position.placement === 'above' ? 'translateY(-100%)' : undefined,
            }}
            className="z-[200] overflow-y-auto overscroll-contain rounded-lg border border-border bg-card p-1 shadow-lg"
            onWheel={(event) => event.stopPropagation()}
          >
            {players.map((player) => {
              const isSelected = player.id === value
              return (
                <button
                  key={player.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(player.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors',
                    'hover:bg-muted',
                    isSelected && 'bg-primary/10 text-primary'
                  )}
                >
                  <PositionBadge position={player.position as Position} />
                  <span className="min-w-0 flex-1 truncate font-medium">{player.name}</span>
                  <span className="shrink-0 tabular-nums text-brand-gold">
                    +{SCORER_POINTS_BY_POSITION[player.position] ?? 0}
                  </span>
                </button>
              )
            })}
          </div>,
          document.body
        )
      : null

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex w-full items-center gap-1.5 rounded-lg border border-border/70 bg-background px-2 py-1.5 text-xs transition-colors',
          'hover:border-primary/30 hover:bg-muted/40',
          'focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        {selected ? (
          <>
            <PositionBadge position={selected.position as Position} />
            <span className="min-w-0 flex-1 truncate text-left font-medium">{selected.name}</span>
            <span className="shrink-0 tabular-nums text-brand-gold">
              +{SCORER_POINTS_BY_POSITION[selected.position] ?? 0}
            </span>
          </>
        ) : (
          <span className="flex-1 text-center text-muted-foreground">{slotLabel}</span>
        )}
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
          aria-hidden
        />
      </button>
      {dropdown}
    </div>
  )
}

interface GoalScorerSideProps {
  count: number
  players: GoalScorerPlayer[]
  values: string[]
  onChange: (values: string[]) => void
  disabled?: boolean
  align: 'left' | 'right'
  readOnly?: boolean
}

export function GoalScorerSide({
  count,
  players,
  values,
  onChange,
  disabled = false,
  align,
  readOnly = false,
}: GoalScorerSideProps) {
  if (count <= 0) return null

  const sortedPlayers = sortPlayersForScorerPicker(players)
  const slots = Array.from({ length: count }, (_, index) => values[index] ?? '')
  const playerById = new Map(sortedPlayers.map((player) => [player.id, player]))

  function updateSlot(index: number, playerId: string) {
    const next = [...values]
    while (next.length <= index) next.push('')
    next[index] = playerId
    onChange(next)
  }

  if (readOnly) {
    const picked = slots.filter(Boolean)
    if (picked.length === 0) return null

    return (
      <div className={cn('space-y-1', align === 'right' && 'text-right')}>
        {picked.map((playerId, index) => {
          const player = playerById.get(playerId)
          if (!player) return null
          return (
            <div
              key={`${playerId}-${index}`}
              className="flex items-center gap-1.5 text-[11px]"
            >
              <PositionBadge position={player.position as Position} />
              <span className="truncate font-medium">{player.name}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {slots.map((value, index) => (
        <PlayerSelect
          key={`slot-${index}`}
          value={value}
          players={sortedPlayers}
          onChange={(playerId) => updateSlot(index, playerId)}
          disabled={disabled}
          align={align}
          slotLabel={`Gol ${index + 1}`}
        />
      ))}
    </div>
  )
}

interface GoalScorersRowProps {
  homeCount: number
  awayCount: number
  homePlayers: GoalScorerPlayer[]
  awayPlayers: GoalScorerPlayer[]
  homeValues: string[]
  awayValues: string[]
  onHomeChange: (values: string[]) => void
  onAwayChange: (values: string[]) => void
  disabled?: boolean
  readOnly?: boolean
}

export function GoalScorersRow({
  homeCount,
  awayCount,
  homePlayers,
  awayPlayers,
  homeValues,
  awayValues,
  onHomeChange,
  onAwayChange,
  disabled = false,
  readOnly = false,
}: GoalScorersRowProps) {
  if (homeCount + awayCount === 0) return null

  const showHome = homeCount > 0
  const showAway = awayCount > 0

  return (
    <div className="flex items-start gap-3 border-t border-border/50 pt-3">
      <div className="min-w-0 flex-1">
        {showHome ? (
          <GoalScorerSide
            count={homeCount}
            players={homePlayers}
            values={homeValues}
            onChange={onHomeChange}
            disabled={disabled}
            align="left"
            readOnly={readOnly}
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        {showAway ? (
          <GoalScorerSide
            count={awayCount}
            players={awayPlayers}
            values={awayValues}
            onChange={onAwayChange}
            disabled={disabled}
            align="right"
            readOnly={readOnly}
          />
        ) : null}
      </div>
    </div>
  )
}

/** @deprecated Usar GoalScorerSide / GoalScorersRow */
export function GoalScorerPicker({
  count,
  players,
  values,
  onChange,
  disabled = false,
}: {
  label?: string
  count: number
  players: GoalScorerPlayer[]
  values: string[]
  onChange: (values: string[]) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <GoalScorerSide
      count={count}
      players={players}
      values={values}
      onChange={onChange}
      disabled={disabled}
      align="left"
      readOnly={false}
    />
  )
}
