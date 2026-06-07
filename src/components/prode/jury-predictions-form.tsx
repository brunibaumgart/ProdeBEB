'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { clearJuryPrediction, saveJuryPrediction } from '@/app/actions/jury'
import { AwardEntityPicker } from '@/components/prode/award-entity-picker'
import { Button } from '@/components/ui/button'
import {
  JURY_CATEGORIES,
  JURY_CATEGORY_GROUPS,
  type JuryCategoryDefinition,
} from '@/lib/jury/jury-categories'
import type { AwardPlayerOption, AwardTeamOption } from '@/lib/queries/awards'
import { cn } from '@/lib/utils'

type SavedPrediction = {
  categoryId: string
  playerId: string | null
  teamId: string | null
}

interface JuryPredictionsFormProps {
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

export function JuryPredictionsForm({
  players,
  teams,
  initialPredictions,
  locked,
  lockLabel,
}: JuryPredictionsFormProps) {
  const initialMap = useMemo(
    () => new Map(initialPredictions.map((prediction) => [prediction.categoryId, prediction])),
    [initialPredictions],
  )

  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const entries: Record<string, string> = {}
    for (const category of JURY_CATEGORIES) {
      entries[category.id] = getSelectionId(initialMap.get(category.id))
    }
    return entries
  })

  const [saved, setSaved] = useState<Record<string, string>>(() => {
    const entries: Record<string, string> = {}
    for (const category of JURY_CATEGORIES) {
      entries[category.id] = getSelectionId(initialMap.get(category.id))
    }
    return entries
  })

  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const completedCount = JURY_CATEGORIES.filter((category) => saved[category.id]).length

  function updateDraft(categoryId: string, value: string) {
    setDrafts((current) => ({ ...current, [categoryId]: value }))
  }

  function saveCategory(category: JuryCategoryDefinition) {
    const selectionId = drafts[category.id]?.trim()
    if (!selectionId) {
      toast.error('Elegí una opción antes de guardar.')
      return
    }

    setPendingCategoryId(category.id)
    startTransition(async () => {
      const result = await saveJuryPrediction(category.id, selectionId)
      setPendingCategoryId(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setSaved((current) => ({ ...current, [category.id]: selectionId }))
      toast.success(result.message)
    })
  }

  function removeCategory(categoryId: string) {
    setPendingCategoryId(categoryId)
    startTransition(async () => {
      const result = await clearJuryPrediction(categoryId)
      setPendingCategoryId(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setDrafts((current) => ({ ...current, [categoryId]: '' }))
      setSaved((current) => ({ ...current, [categoryId]: '' }))
      toast.success(result.message)
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Elegí tus picks subjetivos antes del primer partido. Después del torneo, el jurado define
          los ganadores y ahí se calculan los puntos.
        </p>
        <p className="mt-2 text-sm">
          <span className="font-medium text-foreground">{completedCount}</span>
          <span className="text-muted-foreground">
            {' '}
            de {JURY_CATEGORIES.length} elegidos
          </span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Cierre: {lockLabel}</p>
      </div>

      {JURY_CATEGORY_GROUPS.map((group) => {
        const categories = JURY_CATEGORIES.filter((category) => category.category === group.id)
        if (categories.length === 0) return null

        return (
          <section key={group.id}>
            <h2 className="mb-3 font-heading text-xl tracking-wide">{group.label.toUpperCase()}</h2>
            <div className="grid gap-4">
              {categories.map((category) => {
                const isSaved = Boolean(saved[category.id])
                const isDirty = drafts[category.id] !== saved[category.id]
                const isSaving = isPending && pendingCategoryId === category.id

                return (
                  <article
                    key={category.id}
                    className={cn(
                      'rounded-xl border border-border bg-card p-4',
                      isSaved && 'border-primary/20',
                    )}
                  >
                    <div className="mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{category.title}</h3>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {category.subtitle}
                        </span>
                        {isSaved ? (
                          <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[11px] font-medium text-brand-green">
                            Guardado
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                    </div>

                    <AwardEntityPicker
                      pickType={category.pickType}
                      players={players}
                      teams={teams}
                      value={drafts[category.id] ?? ''}
                      onChange={(value) => updateDraft(category.id, value)}
                      disabled={locked || isSaving}
                      placeholder={
                        category.pickType === 'player' ? 'Buscar jugador…' : 'Buscar selección…'
                      }
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={locked || isSaving || !drafts[category.id]}
                        onClick={() => saveCategory(category)}
                      >
                        {isSaving ? 'Guardando…' : isDirty || !isSaved ? 'Guardar' : 'Actualizar'}
                      </Button>
                      {isSaved ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={locked || isSaving}
                          onClick={() => removeCategory(category.id)}
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
