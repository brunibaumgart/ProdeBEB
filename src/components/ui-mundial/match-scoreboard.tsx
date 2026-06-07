'use client'

import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import { ScoreInput } from '@/components/ui-mundial/score-input'
import { cn } from '@/lib/utils'

export interface MatchScoreboardTeam {
  name: string
  iso2?: string
  flagEmoji?: string
}

interface MatchScoreboardProps {
  home: MatchScoreboardTeam
  away: MatchScoreboardTeam
  homeScore?: number | null
  awayScore?: number | null
  homeRealScore?: number | null
  awayRealScore?: number | null
  editable?: boolean
  disabled?: boolean
  showReal?: boolean
  size?: 'default' | 'compact'
  onHomeChange?: (value: number | null) => void
  onAwayChange?: (value: number | null) => void
  className?: string
  contrast?: boolean
}

function TeamScoreSide({
  team,
  score,
  realScore,
  editable,
  disabled,
  showReal,
  onChange,
  align,
  compact,
  contrast,
}: {
  team: MatchScoreboardTeam
  score?: number | null
  realScore?: number | null
  editable?: boolean
  disabled?: boolean
  showReal?: boolean
  onChange?: (value: number | null) => void
  align: 'left' | 'right'
  compact?: boolean
  contrast?: boolean
}) {
  const isRight = align === 'right'
  const scoreSize = compact ? 'size-8 text-lg' : 'size-11 text-2xl'
  const inputSize = compact ? '[&_input]:size-8 [&_input]:text-lg' : '[&_input]:size-11 [&_input]:text-xl'

  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 items-center',
        compact ? 'gap-1.5' : 'gap-2',
        isRight ? 'flex-row-reverse text-right' : 'text-left'
      )}
    >
      {team.iso2 ? (
        <FlagIcon
          iso2={team.iso2}
          flagEmoji={team.flagEmoji}
          size={compact ? 'sm' : 'md'}
          className="shrink-0"
        />
      ) : (
        <span className="flex size-5 shrink-0 items-center justify-center rounded bg-muted text-[9px] font-bold text-muted-foreground">
          ?
        </span>
      )}

      {!compact && (
        <div className={cn('min-w-0 flex-1', isRight && 'items-end')}>
          <p
            className={cn(
              'truncate text-xs font-semibold leading-tight sm:text-sm',
              contrast ? 'text-white' : undefined
            )}
            title={team.name}
          >
            {team.name}
          </p>
          {showReal && realScore != null && !editable && (
            <p className={cn('text-[10px]', contrast ? 'text-white/70' : 'text-muted-foreground')}>
              Real: {realScore}
            </p>
          )}
        </div>
      )}

      <div className="shrink-0">
        {editable && onChange ? (
          <ScoreInput
            value={score ?? null}
            onChange={onChange}
            disabled={disabled}
            label={team.name}
            hideLabel
            className={inputSize}
          />
        ) : (
          <span
            className={cn(
              'inline-flex items-center justify-center font-heading tabular-nums',
              contrast ? 'text-white' : 'text-primary',
              scoreSize
            )}
            aria-label={`Goles de ${team.name}`}
            title={compact ? team.name : undefined}
          >
            {score ?? '-'}
          </span>
        )}
      </div>

      {compact && showReal && realScore != null && !editable && (
        <span className="text-[10px] tabular-nums text-muted-foreground">({realScore})</span>
      )}
    </div>
  )
}

export function MatchScoreboard({
  home,
  away,
  homeScore,
  awayScore,
  homeRealScore,
  awayRealScore,
  editable = false,
  disabled = false,
  showReal = false,
  size = 'default',
  onHomeChange,
  onAwayChange,
  className,
  contrast = false,
}: MatchScoreboardProps) {
  const compact = size === 'compact'

  return (
    <div
      className={cn(
        compact ? 'px-0 py-0' : 'rounded-xl border border-border/60 bg-muted/20 px-3 py-4 sm:px-4',
        className
      )}
    >
      <div className={cn('flex items-center', compact ? 'gap-1.5' : 'gap-2 sm:gap-4')}>
        <TeamScoreSide
          team={home}
          score={homeScore}
          realScore={homeRealScore}
          editable={editable}
          disabled={disabled}
          showReal={showReal}
          onChange={onHomeChange}
          align="left"
          compact={compact}
          contrast={contrast}
        />

        <span
          className={cn(
            'shrink-0 font-heading',
            contrast ? 'text-white/50' : 'text-muted-foreground/60',
            compact ? 'text-sm' : 'text-lg'
          )}
        >
          ·
        </span>

        <TeamScoreSide
          team={away}
          score={awayScore}
          realScore={awayRealScore}
          editable={editable}
          disabled={disabled}
          showReal={showReal}
          onChange={onAwayChange}
          align="right"
          compact={compact}
          contrast={contrast}
        />
      </div>
    </div>
  )
}
