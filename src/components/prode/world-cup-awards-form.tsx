'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { clearAwardPrediction, saveAwardPrediction } from '@/app/actions/awards'
import { AwardEntityPicker } from '@/components/prode/award-entity-picker'
import { Button } from '@/components/ui/button'
import {
  WORLD_CUP_AWARD_CATEGORIES,
  WORLD_CUP_AWARDS,
  type WorldCupAwardDefinition,
} from '@/lib/awards/world-cup-awards'
import type { AwardPlayerOption, AwardTeamOption } from '@/lib/queries/awards'
import { cn } from '@/lib/utils'

type SavedPrediction = {
  awardId: string
  playerId: string | null
  teamId: string | null
}

interface WorldCupAwardsFormProps {
  players: AwardPlayerOption[]
  teams: AwardTeamOption[]
  initialPredictions: SavedPrediction[]
  locked: boolean
  lockLabel: string
}

function getSelectionId(prediction: SavedPrediction | undefined): string {
  if (!prediction) return ''
  return prediction.playerId ?? prediction.teamId ?? ''
}

export function WorldCupAwardsForm({
  players,
  teams,
  initialPredictions,
  locked,
  lockLabel,
}: WorldCupAwardsFormProps) {
  const initialMap = useMemo(
    () => new Map(initialPredictions.map((prediction) => [prediction.awardId, prediction])),
    [initialPredictions],
  )

  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const entries: Record<string, string> = {}
    for (const award of WORLD_CUP_AWARDS) {
      entries[award.id] = getSelectionId(initialMap.get(award.id))
    }
    return entries
  })

  const [saved, setSaved] = useState<Record<string, string>>(() => {
    const entries: Record<string, string> = {}
    for (const award of WORLD_CUP_AWARDS) {
      entries[award.id] = getSelectionId(initialMap.get(award.id))
    }
    return entries
  })

  const [pendingAwardId, setPendingAwardId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const completedCount = WORLD_CUP_AWARDS.filter((award) => saved[award.id]).length

  function updateDraft(awardId: string, value: string) {
    setDrafts((current) => ({ ...current, [awardId]: value }))
  }

  function saveAward(award: WorldCupAwardDefinition) {
    const selectionId = drafts[award.id]?.trim()
    if (!selectionId) {
      toast.error('Elegí una opción antes de guardar.')
      return
    }

    setPendingAwardId(award.id)
    startTransition(async () => {
      const result = await saveAwardPrediction(award.id, selectionId)
      setPendingAwardId(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setSaved((current) => ({ ...current, [award.id]: selectionId }))
      toast.success(result.message)
    })
  }

  function removeAward(awardId: string) {
    setPendingAwardId(awardId)
    startTransition(async () => {
      const result = await clearAwardPrediction(awardId)
      setPendingAwardId(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setDrafts((current) => ({ ...current, [awardId]: '' }))
      setSaved((current) => ({ ...current, [awardId]: '' }))
      toast.success(result.message)
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Completá tus predicciones especiales antes del primer partido oficial del mundial.
        </p>
        <p className="mt-2 text-sm">
          <span className="font-medium text-foreground">{completedCount}</span>
          <span className="text-muted-foreground">
            {' '}
            de {WORLD_CUP_AWARDS.length} elegidos
          </span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Cierre: {lockLabel}</p>
      </div>

      {WORLD_CUP_AWARD_CATEGORIES.map((category) => {
        const awards = WORLD_CUP_AWARDS.filter((award) => award.category === category.id)
        if (awards.length === 0) return null

        return (
          <section key={category.id}>
            <h2 className="mb-3 font-heading text-xl tracking-wide">{category.label.toUpperCase()}</h2>
            <div className="grid gap-4">
              {awards.map((award) => {
                const isSaved = Boolean(saved[award.id])
                const isDirty = drafts[award.id] !== saved[award.id]
                const isSaving = isPending && pendingAwardId === award.id

                return (
                  <article
                    key={award.id}
                    className={cn(
                      'rounded-xl border border-border bg-card p-4',
                      isSaved && 'border-primary/20',
                    )}
                  >
                    <div className="mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{award.title}</h3>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {award.subtitle}
                        </span>
                        {isSaved ? (
                          <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[11px] font-medium text-brand-green">
                            Guardado
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{award.description}</p>
                    </div>

                    <AwardEntityPicker
                      pickType={award.pickType}
                      players={players}
                      teams={teams}
                      value={drafts[award.id] ?? ''}
                      onChange={(value) => updateDraft(award.id, value)}
                      disabled={locked || isSaving}
                      playerFilter={award.playerFilter}
                      placeholder={
                        award.pickType === 'player' ? 'Buscar jugador…' : 'Buscar selección…'
                      }
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={locked || isSaving || !drafts[award.id]}
                        onClick={() => saveAward(award)}
                      >
                        {isSaving ? 'Guardando…' : isDirty || !isSaved ? 'Guardar' : 'Actualizar'}
                      </Button>
                      {isSaved ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={locked || isSaving}
                          onClick={() => removeAward(award.id)}
                        >
                          Quitar
                        </Button>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
