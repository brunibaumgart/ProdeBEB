'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { ArrowDown, ArrowUp, Loader2 } from 'lucide-react'

import { saveThirdPlaceTiebreakOrder } from '@/app/actions/bracket'
import { R32CompactBadge } from '@/components/ui-mundial/group-table'
import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import type { Standing } from '@/lib/bracket'
import { resolveGroupR32Opponents } from '@/lib/bracket/group-r32-opponents'
import {
  getRelevantThirdPlaceTiebreakBuckets,
  isThirdPlaceTiebreakComplete,
  rankAllThirdsWithTiebreak,
  type ThirdPlaceTiebreakBucket,
  type ThirdPlaceTiebreakOrder,
} from '@/lib/bracket/third-place-tiebreak'
import { cn } from '@/lib/utils'

interface ThirdPlaceTiebreakPanelProps {
  groupStandings: Map<string, Standing[]>
  teamByName: Map<
    string,
    { nameEs: string; iso2: string; flagEmoji: string; group: string }
  >
  tiebreakOrder: ThirdPlaceTiebreakOrder
  editable: boolean
  groupsComplete: boolean
  onOrderChange: (order: ThirdPlaceTiebreakOrder) => void
  dense?: boolean
}

function moveTeam(order: string[], teamName: string, direction: 'up' | 'down'): string[] {
  const index = order.indexOf(teamName)
  if (index < 0) return order

  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= order.length) return order

  const next = [...order]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

function BucketCard({
  bucket,
  order,
  teamByName,
  groupStandings,
  tiebreakOrder,
  groupsComplete,
  editable,
  saving,
  onMove,
  dense = false,
}: {
  bucket: ThirdPlaceTiebreakBucket
  order: string[]
  teamByName: Map<string, { nameEs: string; iso2: string; flagEmoji: string; group: string }>
  groupStandings: Map<string, Standing[]>
  tiebreakOrder: ThirdPlaceTiebreakOrder
  groupsComplete: boolean
  editable: boolean
  saving: boolean
  onMove: (teamName: string, direction: 'up' | 'down') => void
  dense?: boolean
}) {
  const previewOrder = useMemo(
    () => ({ ...tiebreakOrder, [bucket.key]: order }),
    [tiebreakOrder, bucket.key, order],
  )
  const globalRanks = useMemo(
    () => rankAllThirdsWithTiebreak(groupStandings, previewOrder),
    [groupStandings, previewOrder],
  )
  const statsByTeam = useMemo(
    () => new Map(bucket.teams.map((team) => [team.teamName, team])),
    [bucket.teams],
  )

  return (
    <section className={cn('rounded-xl border border-border bg-card', dense ? 'p-2' : 'p-4')}>
      <div className={cn('flex items-center justify-between gap-2', dense ? 'mb-2' : 'mb-3')}>
        <h3 className={cn('font-medium', dense && 'text-sm')}>
          Terceros con {bucket.points} {bucket.points === 1 ? 'punto' : 'puntos'}
        </h3>
        {!dense && (
          <span className="text-xs text-muted-foreground">
            {bucket.teams.length} equipos · ordená de mejor a peor
          </span>
        )}
      </div>

      <ol className={cn(dense ? 'space-y-1' : 'space-y-2')}>
        {order.map((teamName, index) => {
          const group = bucket.teamGroups.get(teamName) ?? teamByName.get(teamName)?.group ?? '?'
          const team = teamByName.get(teamName)
          const stats = statsByTeam.get(teamName)
          const rankInfo = globalRanks.get(teamName)
          const qualified = rankInfo?.qualified ?? false
          const standings = groupStandings.get(group) ?? []
          const projection = resolveGroupR32Opponents(
            group,
            standings,
            groupStandings,
            groupsComplete,
            previewOrder,
          )[2]

          return (
            <li
              key={teamName}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-2 py-1.5',
                dense && 'py-1',
                qualified
                  ? 'border-brand-green/25 bg-brand-green/5'
                  : 'border-border/70 bg-muted/30',
              )}
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                  qualified
                    ? 'bg-brand-green/15 text-brand-green'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {rankInfo?.rank ?? index + 1}
              </span>
              {team ? (
                <FlagIcon iso2={team.iso2} flagEmoji={team.flagEmoji} size="sm" />
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">{team?.nameEs ?? teamName}</p>
                  {projection ? <R32CompactBadge projection={projection} /> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  3.º Grupo {group}
                  {stats ? ` · ${stats.points} pts · DG ${stats.goalDiff >= 0 ? '+' : ''}${stats.goalDiff}` : ''}
                  {qualified ? ' · clasificado entre los 8 mejores terceros' : ' · fuera del top 8'}
                </p>
              </div>
              {editable && (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={saving || index === 0}
                    onClick={() => onMove(teamName, 'up')}
                    className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
                    aria-label="Subir"
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={saving || index === order.length - 1}
                    onClick={() => onMove(teamName, 'down')}
                    className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
                    aria-label="Bajar"
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export function ThirdPlaceTiebreakPanel({
  groupStandings,
  teamByName,
  tiebreakOrder,
  editable,
  groupsComplete,
  onOrderChange,
  dense = false,
}: ThirdPlaceTiebreakPanelProps) {
  const [isPending, startTransition] = useTransition()
  const relevantBuckets = useMemo(
    () => getRelevantThirdPlaceTiebreakBuckets(groupStandings),
    [groupStandings],
  )
  const [activeBucketKey, setActiveBucketKey] = useState(relevantBuckets[0]?.key ?? '')
  const isComplete = useMemo(
    () => isThirdPlaceTiebreakComplete(groupStandings, tiebreakOrder),
    [groupStandings, tiebreakOrder],
  )

  useEffect(() => {
    if (!relevantBuckets.some((bucket) => bucket.key === activeBucketKey)) {
      setActiveBucketKey(relevantBuckets[0]?.key ?? '')
    }
  }, [relevantBuckets, activeBucketKey])

  const visibleBuckets =
    dense && editable
      ? relevantBuckets.filter((bucket) => bucket.key === activeBucketKey)
      : relevantBuckets

  function persistBucket(bucket: ThirdPlaceTiebreakBucket, nextOrder: string[]) {
    const next: ThirdPlaceTiebreakOrder = {
      ...tiebreakOrder,
      [bucket.key]: nextOrder,
    }
    onOrderChange(next)

    if (!editable) return

    startTransition(async () => {
      const result = await saveThirdPlaceTiebreakOrder(next)
      if (!result.ok) {
        onOrderChange(tiebreakOrder)
      }
    })
  }

  if (!groupsComplete) {
    return (
      <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Completá todos los partidos de grupos para definir el orden de los mejores terceros.
      </p>
    )
  }

  if (relevantBuckets.length === 0) {
    return (
      <p className="rounded-xl border border-brand-green/30 bg-brand-green/5 p-6 text-center text-sm text-muted-foreground">
        No hay terceros empatados que necesiten desempate manual. Podés continuar a eliminatorias.
      </p>
    )
  }

  return (
    <div className={cn('space-y-4', dense && 'flex min-h-0 flex-1 flex-col gap-2 space-y-0 overflow-hidden')}>
      {!dense && (
        <p className="text-sm text-muted-foreground">
          Con victoria/empate muchos terceros quedan empatados en puntos. Definí el orden entre los
          empatados que compiten por los lugares restantes entre los 8 mejores terceros.
        </p>
      )}

      {!isComplete && !dense && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Ordená todos los grupos de terceros empatados antes de pasar a eliminatorias.
        </p>
      )}

      {isComplete && !dense && (
        <p
          className={cn(
            'rounded-lg border border-brand-green/30 bg-brand-green/5 px-4 py-3 text-sm text-brand-green',
          )}
        >
          Desempate listo. Los cruces de dieciseisavos usarán este orden.
        </p>
      )}

      {dense && editable && relevantBuckets.length > 1 && (
        <div className="grid shrink-0 grid-cols-2 gap-1">
          {relevantBuckets.map((bucket) => (
            <button
              key={bucket.key}
              type="button"
              onClick={() => setActiveBucketKey(bucket.key)}
              className={cn(
                'rounded-md border py-1.5 text-center text-[10px] font-semibold',
                activeBucketKey === bucket.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground',
              )}
            >
              {bucket.points} pts · {bucket.teams.length}
            </button>
          ))}
        </div>
      )}

      <div className={cn(dense && 'min-h-0 flex-1 overflow-y-auto overscroll-contain')}>
      {visibleBuckets.map((bucket) => {
        const order =
          tiebreakOrder[bucket.key] ?? bucket.teams.map((team) => team.teamName)

        return (
          <BucketCard
            key={bucket.key}
            bucket={bucket}
            order={order}
            teamByName={teamByName}
            groupStandings={groupStandings}
            tiebreakOrder={tiebreakOrder}
            groupsComplete={groupsComplete}
            editable={editable}
            saving={isPending}
            onMove={(teamName, direction) => {
              persistBucket(bucket, moveTeam(order, teamName, direction))
            }}
            dense={dense}
          />
        )
      })}
      </div>

      {isPending && (
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Guardando orden…
        </p>
      )}
    </div>
  )
}
