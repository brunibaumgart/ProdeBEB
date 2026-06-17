'use client'

import { AlertCircle, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

import { dismissMatchdayDrawScoringNotice } from '@/app/actions/announcements'
import { MATCHDAY_DRAW_SCORING_NOTICE_QUERY } from '@/lib/announcements/matchday-draw-scoring'
import { Button } from '@/components/ui/button'

interface MatchdayScoringNoticeModalProps {
  noticeSeenAt: Date | null
}

export function MatchdayScoringNoticeModal({ noticeSeenAt }: MatchdayScoringNoticeModalProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const forceFromUrl = searchParams.get('aviso') === MATCHDAY_DRAW_SCORING_NOTICE_QUERY
  const showFromDb = noticeSeenAt == null

  const [visible, setVisible] = useState(showFromDb || forceFromUrl)

  useEffect(() => {
    if (forceFromUrl) setVisible(true)
  }, [forceFromUrl])

  if (!visible) return null

  function handleDismiss() {
    setVisible(false)
    startTransition(async () => {
      await dismissMatchdayDrawScoringNotice()
      if (forceFromUrl) {
        const url = new URL(window.location.href)
        url.searchParams.delete('aviso')
        router.replace(`${url.pathname}${url.search}${url.hash}`)
      }
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-4 pb-24 sm:items-center sm:pb-4">
      <div
        role="dialog"
        aria-labelledby="matchday-scoring-notice-title"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
              <AlertCircle className="size-5" aria-hidden />
            </div>
            <div>
              <h2 id="matchday-scoring-notice-title" className="font-heading text-xl tracking-wide">
                AJUSTE EN PUNTOS
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Corregimos cómo se puntúan los empates en Fecha a Fecha.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isPending}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4 text-sm leading-relaxed text-foreground">
          <p>
            Antes, si acertabas un <strong>empate</strong> sin marcador exacto, el sistema sumaba un
            punto extra por “diferencia de goles”. En un empate la diferencia siempre es 0, así que
            ese bonus no correspondía.
          </p>
          <p>
            <strong>Qué cambió:</strong> el bonus de diferencia solo aplica cuando hay ganador. Un
            empate acertado (sin exacto) vale <strong>1 punto</strong>, no 2.
          </p>
          <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Ya recalculamos los puntos de todos los partidos jugados. Revisá tu ranking en Prode
            Fecha a Fecha y en tus torneos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border/70 px-5 py-4">
          <Button type="button" onClick={handleDismiss} disabled={isPending}>
            {isPending ? 'Cerrando…' : 'Entendido'}
          </Button>
        </div>
      </div>
    </div>
  )
}
