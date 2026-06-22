import { Eye, MessageSquare, UserCheck, Users } from 'lucide-react'

import { formatArgentinaDate } from '@/lib/time'

type VisitStats = {
  totalVisits: number
  uniqueVisitors: number
  visitsLast7Days: number
}

type VisitRow = {
  id: string
  visitorId: string
  path: string | null
  createdAt: Date
}

type NoteRow = {
  id: string
  name: string | null
  isAnonymous: boolean
  message: string
  createdAt: Date
}

type Props = {
  stats: VisitStats
  visits: VisitRow[]
  notes: NoteRow[]
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Eye
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <span>
        <span className="block text-2xl font-semibold tabular-nums">{value}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </span>
    </div>
  )
}

export function AdminVisitsPanel({ stats, visits, notes }: Props) {
  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={UserCheck} label="Visitantes únicos" value={stats.uniqueVisitors} />
        <StatCard icon={Eye} label="Visitas totales" value={stats.totalVisits} />
        <StatCard icon={Users} label="Visitas últimos 7 días" value={stats.visitsLast7Days} />
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="size-5 text-primary" aria-hidden />
          <h2 className="font-heading text-xl tracking-wide">MENSAJES DE VISITANTES</h2>
          <span className="text-sm text-muted-foreground">({notes.length})</span>
        </div>
        {notes.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            Todavía no hay mensajes.
          </p>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {note.isAnonymous || !note.name ? (
                      <span className="italic text-muted-foreground">Anónimo</span>
                    ) : (
                      note.name
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatArgentinaDate(note.createdAt)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground">{note.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Eye className="size-5 text-primary" aria-hidden />
          <h2 className="font-heading text-xl tracking-wide">VISITAS RECIENTES</h2>
        </div>
        {visits.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            Todavía no hay visitas registradas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium">Ruta de entrada</th>
                  <th className="px-4 py-2 font-medium">Visitante</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit) => (
                  <tr key={visit.id} className="border-b border-border/40">
                    <td className="whitespace-nowrap px-4 py-2">
                      {formatArgentinaDate(visit.createdAt)}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{visit.path ?? '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                      {visit.visitorId.slice(0, 8)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
