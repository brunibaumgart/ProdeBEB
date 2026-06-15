'use client'

import { useState } from 'react'
import { Hash, Lock, ListOrdered } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import {
  formatGroupOutcomeLabel,
  scoresToGroupOutcome,
  type GroupMatchOutcome,
} from '@/lib/bracket/match-outcome'
import { isSimulatorMatchFinished } from '@/lib/bracket/simulator'
import { cn } from '@/lib/utils'

type InputMode = 'outcome' | 'exact'

interface SimulatorMatchRowProps {
  matchId: number
  status: string
  homeScore: number | null
  awayScore: number | null
  home: { name: string; iso2?: string; flagEmoji?: string }
  away: { name: string; iso2?: string; flagEmoji?: string }
  simulatedHome: number | null
  simulatedAway: number | null
  onOutcomeChange: (matchId: number, outcome: GroupMatchOutcome | null) => void
  onScoreChange: (matchId: number, home: number | null, away: number | null) => void
  className?: string
}

function OutcomeButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-auto w-full justify-center px-3 py-2.5 text-sm font-medium',
        active
          ? 'border-primary bg-primary/15 text-primary hover:bg-primary/20'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </Button>
  )
}

function ScoreInput({
  value,
  onChange,
  label,
}: {
  value: number | null
  onChange: (value: number | null) => void
  label: string
}) {
  return (
    <label className="flex flex-1 flex-col items-center gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <Input
        type="number"
        min={0}
        max={15}
        inputMode="numeric"
        value={value ?? ''}
        onChange={(event) => {
          const raw = event.target.value
          if (raw === '') {
            onChange(null)
            return
          }
          const parsed = Number.parseInt(raw, 10)
          if (Number.isNaN(parsed)) return
          onChange(Math.max(0, Math.min(15, parsed)))
        }}
        className="h-11 text-center text-lg font-semibold tabular-nums"
      />
    </label>
  )
}

export function SimulatorMatchRow({
  matchId,
  status,
  homeScore,
  awayScore,
  home,
  away,
  simulatedHome,
  simulatedAway,
  onOutcomeChange,
  onScoreChange,
  className,
}: SimulatorMatchRowProps) {
  const [inputMode, setInputMode] = useState<InputMode>('outcome')
  const locked = isSimulatorMatchFinished({ status, homeScore, awayScore })
  const lockedOutcome =
    locked && homeScore != null && awayScore != null
      ? scoresToGroupOutcome(homeScore, awayScore)
      : null

  const activeOutcome =
    simulatedHome != null && simulatedAway != null
      ? scoresToGroupOutcome(simulatedHome, simulatedAway)
      : null

  const hasSimulation = simulatedHome != null && simulatedAway != null

  function handleSelect(nextOutcome: GroupMatchOutcome) {
    if (locked) return
    onOutcomeChange(matchId, activeOutcome === nextOutcome ? null : nextOutcome)
  }

  function handleExactScoreChange(side: 'home' | 'away', value: number | null) {
    if (locked) return

    const nextHome = side === 'home' ? value : simulatedHome
    const nextAway = side === 'away' ? value : simulatedAway

    if (nextHome == null && nextAway == null) {
      onScoreChange(matchId, null, null)
      return
    }

    onScoreChange(matchId, nextHome ?? 0, nextAway ?? 0)
  }

  function handleModeToggle() {
    if (locked) return

    if (inputMode === 'outcome') {
      setInputMode('exact')
      if (simulatedHome == null && simulatedAway == null) {
        onScoreChange(matchId, 0, 0)
      }
      return
    }

    setInputMode('outcome')
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-card/50 p-3 transition-colors',
        locked
          ? 'border-brand-green/30 bg-brand-green/[0.04]'
          : hasSimulation
            ? 'border-primary/25'
            : 'border-border/60',
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          {home.iso2 ? <FlagIcon iso2={home.iso2} flagEmoji={home.flagEmoji} size="sm" /> : null}
          <span className="truncate">{home.name}</span>
        </div>

        {locked ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-green/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-green">
            <Lock className="size-3" aria-hidden />
            Final
          </span>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={handleModeToggle}
            className="shrink-0 rounded-full px-2.5"
            title={inputMode === 'outcome' ? 'Usar marcador exacto' : 'Usar victoria / empate'}
          >
            {inputMode === 'outcome' ? (
              <>
                <Hash aria-hidden />
                Exacto
              </>
            ) : (
              <>
                <ListOrdered aria-hidden />
                V/E/L
              </>
            )}
          </Button>
        )}

        <div className="flex min-w-0 items-center justify-end gap-2 text-sm font-medium">
          <span className="truncate text-right">{away.name}</span>
          {away.iso2 ? <FlagIcon iso2={away.iso2} flagEmoji={away.flagEmoji} size="sm" /> : null}
        </div>
      </div>

      {locked && lockedOutcome ? (
        <p className="rounded-lg bg-muted/30 px-3 py-2 text-center text-sm font-medium text-foreground">
          {formatGroupOutcomeLabel(lockedOutcome, home.name, away.name)}
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            {homeScore} – {awayScore}
          </span>
        </p>
      ) : inputMode === 'exact' ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <ScoreInput
              label={home.name}
              value={simulatedHome}
              onChange={(value) => handleExactScoreChange('home', value)}
            />
            <span className="pt-5 text-sm font-medium text-muted-foreground">–</span>
            <ScoreInput
              label={away.name}
              value={simulatedAway}
              onChange={(value) => handleExactScoreChange('away', value)}
            />
          </div>
          {hasSimulation && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onScoreChange(matchId, null, null)}
              className="w-full"
            >
              Limpiar marcador
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <OutcomeButton
            active={activeOutcome === 'home_win'}
            onClick={() => handleSelect('home_win')}
          >
            Victoria {home.name}
          </OutcomeButton>
          <OutcomeButton active={activeOutcome === 'draw'} onClick={() => handleSelect('draw')}>
            Empate
          </OutcomeButton>
          <OutcomeButton
            active={activeOutcome === 'away_win'}
            onClick={() => handleSelect('away_win')}
          >
            Victoria {away.name}
          </OutcomeButton>
        </div>
      )}
    </div>
  )
}
