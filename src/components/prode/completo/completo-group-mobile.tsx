'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { BracketMatchRow } from '@/components/prode/bracket-match-row'
import { CompletoMiniStandings } from '@/components/prode/completo/completo-mini-standings'
import { CompletoSyncIconButton } from '@/components/prode/completo/completo-sync-icon-button'
import type { CelebrityGroupInputMode } from '@/lib/bracket/celebrity-predictions'
import type { Standing } from '@/lib/bracket'
import type { BracketSlotPrediction } from '@/lib/queries/bracket'
import { cn } from '@/lib/utils'

const GROUPS = 'ABCDEFGHIJKL'.split('')

type GroupMatch = {
  id: number
  group: string | null
  homeTeam: { nameEs: string; iso2: string; flagEmoji: string } | null
  awayTeam: { nameEs: string; iso2: string; flagEmoji: string } | null
}

interface CompletoGroupMobileProps {
  groupMatches: GroupMatch[]
  groupStandings: Map<string, Standing[]>
  predictions: Record<number, BracketSlotPrediction>
  editable: boolean
  groupInputMode?: CelebrityGroupInputMode
  matchdayGroupCount: number
  groupProgress: { done: number; total: number }
  onPredictionSaved: (matchId: number, prediction: BracketSlotPrediction) => void
}

export function CompletoGroupMobile({
  groupMatches,
  groupStandings,
  predictions,
  editable,
  groupInputMode = 'scores',
  matchdayGroupCount,
  groupProgress,
  onPredictionSaved,
}: CompletoGroupMobileProps) {
  const [selectedGroup, setSelectedGroup] = useState('A')
  const [matchIndex, setMatchIndex] = useState(0)
  const showScores = groupInputMode === 'scores'

  const matchesInGroup = useMemo(
    () => groupMatches.filter((match) => match.group === selectedGroup),
    [groupMatches, selectedGroup],
  )

  useEffect(() => {
    setMatchIndex(0)
  }, [selectedGroup])

  useEffect(() => {
    if (matchIndex >= matchesInGroup.length) {
      setMatchIndex(Math.max(0, matchesInGroup.length - 1))
    }
  }, [matchIndex, matchesInGroup.length])

  const currentMatch = matchesInGroup[matchIndex]

  function goToMatch(delta: number) {
    setMatchIndex((index) => Math.min(matchesInGroup.length - 1, Math.max(0, index + delta)))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <p className="text-xs tabular-nums text-muted-foreground">
          Grupos{' '}
          <span className="font-medium text-foreground">
            {groupProgress.done}/{groupProgress.total}
          </span>
        </p>
        {editable ? (
          <CompletoSyncIconButton
            direction="matchday-to-complete"
            sourceCount={matchdayGroupCount}
            reloadOnSuccess
          />
        ) : null}
      </div>

      <div className="grid shrink-0 grid-cols-6 gap-1">
        {GROUPS.map((group) => {
          const groupMatchIds = groupMatches.filter((match) => match.group === group).map((m) => m.id)
          const done = groupMatchIds.filter((id) => predictions[id]).length
          const complete = showScores ? done === groupMatchIds.length && done > 0 : true
          return (
            <button
              key={group}
              type="button"
              onClick={() => setSelectedGroup(group)}
              className={cn(
                'rounded-md border py-1 text-[10px] font-semibold transition-colors',
                selectedGroup === group
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground',
                complete && 'border-brand-green/40',
              )}
            >
              {group}
            </button>
          )
        })}
      </div>

      <CompletoMiniStandings
        group={selectedGroup}
        standings={groupStandings.get(selectedGroup) ?? []}
        orderOnly={!showScores}
        className="shrink-0"
      />

      {showScores && currentMatch ? (
        <div className="flex min-h-0 flex-1 flex-col justify-between gap-2">
          <BracketMatchRow
            key={currentMatch.id}
            matchId={currentMatch.id}
            home={{
              name: currentMatch.homeTeam!.nameEs,
              iso2: currentMatch.homeTeam!.iso2,
              flagEmoji: currentMatch.homeTeam!.flagEmoji,
            }}
            away={{
              name: currentMatch.awayTeam!.nameEs,
              iso2: currentMatch.awayTeam!.iso2,
              flagEmoji: currentMatch.awayTeam!.flagEmoji,
            }}
            initialHome={predictions[currentMatch.id]?.predHome ?? null}
            initialAway={predictions[currentMatch.id]?.predAway ?? null}
            editable={editable}
            variant="mobile"
            onSaved={(prediction) => {
              onPredictionSaved(currentMatch.id, prediction)
              if (matchIndex < matchesInGroup.length - 1) {
                setMatchIndex((index) => index + 1)
              }
            }}
            className="flex-1"
          />

          <div className="flex shrink-0 items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => goToMatch(-1)}
              disabled={matchIndex === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground disabled:opacity-40"
            >
              <ChevronLeft className="size-4" aria-hidden />
              Anterior
            </button>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {matchIndex + 1}/{matchesInGroup.length}
            </span>
            <button
              type="button"
              onClick={() => goToMatch(1)}
              disabled={matchIndex >= matchesInGroup.length - 1}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground disabled:opacity-40"
            >
              Siguiente
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      ) : !showScores ? (
        <p className="rounded-lg border border-border/60 bg-muted/20 p-3 text-center text-xs text-muted-foreground">
          Solo orden de clasificación en este grupo (sin marcadores).
        </p>
      ) : null}
    </div>
  )
}
