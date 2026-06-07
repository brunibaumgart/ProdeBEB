'use client'

import { useMemo, useState } from 'react'

import type { AdminPredictionView } from '@/lib/queries/admin'
import { cn } from '@/lib/utils'

interface AdminPredictionTableProps {
  predictions: AdminPredictionView[]
  compact?: boolean
  highlightUserId?: string
}

function getPointsClass(points: number | null) {
  if (points == null) return 'text-muted-foreground'
  if (points >= 3) return 'text-brand-green'
  if (points >= 1) return 'text-brand-gold'
  return 'text-muted-foreground'
}

export function AdminPredictionTable({
  predictions,
  compact = false,
  highlightUserId,
}: AdminPredictionTableProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return predictions
    return predictions.filter(
      (prediction) =>
        prediction.userName.toLowerCase().includes(normalized) ||
        prediction.userEmail.toLowerCase().includes(normalized),
    )
  }, [predictions, query])

  if (predictions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        Nadie predijo este partido todavía.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {predictions.length > 5 ? (
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filtrar por usuario o email…"
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className={cn('w-full text-sm', compact ? 'min-w-[520px]' : 'min-w-[640px]')}>
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Usuario</th>
                <th className="px-3 py-2 text-center font-medium">Predicción</th>
                {!compact ? (
                  <th className="px-3 py-2 text-left font-medium">Goleadores</th>
                ) : null}
                <th className="px-3 py-2 text-right font-medium">Pts</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={compact ? 3 : 4}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    Ninguna predicción coincide con el filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((prediction) => (
                  <tr
                    key={prediction.id}
                    className={cn(
                      'border-b border-border/40 last:border-0',
                      highlightUserId === prediction.userId && 'bg-primary/5',
                    )}
                  >
                    <td className="px-3 py-2">
                      <p className="font-medium">{prediction.userName}</p>
                      {!compact ? (
                        <p className="text-xs text-muted-foreground">{prediction.userEmail}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-center font-heading text-base tabular-nums">
                      {prediction.predHome} - {prediction.predAway}
                    </td>
                    {!compact ? (
                      <td className="px-3 py-2 text-muted-foreground">
                        {prediction.scorerNames.length > 0
                          ? prediction.scorerNames.join(', ')
                          : '—'}
                      </td>
                    ) : null}
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span className={cn('font-medium', getPointsClass(prediction.points))}>
                        {prediction.points ?? '—'}
                      </span>
                      {(prediction.pointsScorers ?? 0) > 0 ? (
                        <span className="ml-1 text-xs text-brand-gold">
                          +{prediction.pointsScorers}G
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
