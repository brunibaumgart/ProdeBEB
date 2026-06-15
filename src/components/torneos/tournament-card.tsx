import Link from 'next/link'
import { ArrowRight, Crown, Users } from 'lucide-react'

interface TournamentCardProps {
  id: string
  name: string
  description: string | null
  code: string
  memberCount: number
  isOwner: boolean
  modeMatchday: boolean
  pointsMatchday: number
  rankMatchday: number | null
}

export function TournamentCard({
  id,
  name,
  description,
  code,
  memberCount,
  isOwner,
  modeMatchday,
  pointsMatchday,
  rankMatchday,
}: TournamentCardProps) {
  return (
    <Link href={`/torneos/${id}`} className="block">
      <article className="flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-xl tracking-wide">{name}</h2>
              {isOwner && (
                <Crown className="size-4 text-brand-gold" aria-label="Sos el creador" />
              )}
            </div>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          <span className="shrink-0 rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-xs tracking-[0.2em] text-muted-foreground">
            {code}
          </span>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-3">
          {modeMatchday && (
            <div className="flex items-center justify-end gap-4">
              <p className="mr-auto text-xs uppercase tracking-wide text-muted-foreground">
                Fecha a fecha
              </p>
              {rankMatchday != null && (
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Posición</p>
                  <p className="font-heading text-lg tabular-nums">#{rankMatchday}</p>
                </div>
              )}
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Puntos</p>
                <p className="font-heading text-lg tabular-nums text-primary">{pointsMatchday}</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-2">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="size-4" aria-hidden />
              {memberCount} {memberCount === 1 ? 'miembro' : 'miembros'}
            </div>
            <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
          </div>
        </div>
      </article>
    </Link>
  )
}
