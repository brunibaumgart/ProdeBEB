'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserMinus } from 'lucide-react'

import { kickMember } from '@/app/actions/tournaments'
import { Button } from '@/components/ui/button'

interface AdminMember {
  id: string
  userId: string
  user: { name: string }
}

interface TournamentAdminPanelProps {
  tournamentId: string
  members: AdminMember[]
  currentUserId: string
}

export function TournamentAdminPanel({
  tournamentId,
  members,
  currentUserId,
}: TournamentAdminPanelProps) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleKick(memberId: string) {
    setError(null)
    setPendingId(memberId)
    startTransition(async () => {
      const result = await kickMember(tournamentId, memberId)
      if (!result.ok) {
        setError(result.error)
      } else {
        router.refresh()
      }
      setPendingId(null)
    })
  }

  const others = members.filter((member) => member.userId !== currentUserId)

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-heading text-lg tracking-wide">ADMINISTRAR MIEMBROS</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Como creador del torneo, podés expulsar miembros.
      </p>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {others.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Todavía no hay otros miembros.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border/40">
          {others.map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-sm font-medium">{member.user.name}</span>
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending && pendingId === member.id}
                onClick={() => handleKick(member.id)}
              >
                <UserMinus className="size-4" aria-hidden />
                {isPending && pendingId === member.id ? 'Expulsando…' : 'Expulsar'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
