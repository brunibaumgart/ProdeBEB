'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FlaskConical, Search, Shield, UserPlus, X } from 'lucide-react'

import { inviteUserAsTester, setUserTester } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatArgentinaDate } from '@/lib/time'

export type AdminUserRow = {
  id: string
  name: string
  email: string
  isAdmin: boolean
  isTester: boolean
  createdAt: Date
  _count: { predictions: number; memberships: number }
  memberships: { pointsTotal: number }[]
}

type Props = {
  users: AdminUserRow[]
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function userRowClass(user: AdminUserRow) {
  if (user.isAdmin) {
    return 'border-b border-orange-500/15 bg-orange-500/[0.06] hover:bg-orange-500/10'
  }
  if (user.isTester) {
    return 'border-b border-violet-500/15 bg-violet-500/[0.06] hover:bg-violet-500/10'
  }
  return 'border-b border-border/40'
}

export function AdminUsersPanel({ users }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [isInviting, startInvite] = useTransition()
  const [isToggling, startToggle] = useTransition()

  const filtered = useMemo(() => {
    const q = normalize(search)
    if (!q) return users
    return users.filter(
      (user) =>
        normalize(user.name).includes(q) ||
        normalize(user.email).includes(q),
    )
  }, [search, users])

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    startInvite(async () => {
      const result = await inviteUserAsTester(inviteEmail)
      if (result.ok) {
        setMessage({ type: 'ok', text: result.message })
        setInviteEmail('')
        router.refresh()
      } else {
        setMessage({ type: 'error', text: result.error })
      }
    })
  }

  function handleToggleTester(user: AdminUserRow) {
    setMessage(null)
    setPendingUserId(user.id)
    startToggle(async () => {
      const result = await setUserTester(user.id, !user.isTester)
      setPendingUserId(null)
      if (result.ok) {
        setMessage({ type: 'ok', text: result.message })
        router.refresh()
      } else {
        setMessage({ type: 'error', text: result.error })
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-sm text-muted-foreground">
          Los testers ven los amistosos de prueba antes del lanzamiento. Invitá por email (tiene que
          estar ya registrado) o buscá en la lista y activá el acceso.
        </p>
        <form onSubmit={handleInvite} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <UserPlus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder="email@ejemplo.com — invitar como tester"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="pl-9"
              disabled={isInviting}
            />
          </div>
          <Button type="submit" disabled={isInviting || !inviteEmail.trim()}>
            {isInviting ? 'Invitando…' : 'Invitar tester'}
          </Button>
        </form>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por nombre o email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {message && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.type === 'ok'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
          {message.text}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {filtered.length} de {users.length} usuarios
        {search ? ` · filtro: “${search}”` : ''}
      </p>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">Usuario</th>
                <th className="px-4 py-2.5 text-left font-medium">Email</th>
                <th className="px-4 py-2.5 text-right font-medium">Predicciones</th>
                <th className="px-4 py-2.5 text-right font-medium">Torneos</th>
                <th className="px-4 py-2.5 text-right font-medium text-primary">Puntos</th>
                <th className="px-4 py-2.5 text-left font-medium">Alta</th>
                <th className="px-4 py-2.5 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Ningún usuario coincide con la búsqueda.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className={userRowClass(user)}>
                    <td className="px-4 py-2.5 font-medium">
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <span className={user.isAdmin ? 'text-orange-700 dark:text-orange-300' : user.isTester ? 'text-violet-700 dark:text-violet-300' : ''}>
                          {user.name}
                        </span>
                        {user.isAdmin && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600 ring-1 ring-orange-500/25 dark:text-orange-400">
                            <Shield className="h-2.5 w-2.5" />
                            ADMIN
                          </span>
                        )}
                        {user.isTester && !user.isAdmin && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600 ring-1 ring-violet-500/25 dark:text-violet-400">
                            <FlaskConical className="h-2.5 w-2.5" />
                            TESTER
                          </span>
                        )}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-2.5 ${
                        user.isAdmin
                          ? 'text-orange-700/80 dark:text-orange-300/80'
                          : user.isTester
                            ? 'text-violet-700/80 dark:text-violet-300/80'
                            : 'text-muted-foreground'
                      }`}
                    >{user.email}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{user._count.predictions}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{user._count.memberships}</td>
                    <td className="px-4 py-2.5 text-right font-heading text-base tabular-nums text-primary">
                      {user.memberships[0]?.pointsTotal ?? 0}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatArgentinaDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {user._count.predictions > 0 ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            nativeButton={false}
                            render={
                              <Link href={`/admin?tab=predicciones&userId=${user.id}`}>
                                Ver predicciones
                              </Link>
                            }
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin preds.</span>
                        )}
                        {user.isAdmin ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <Button
                            type="button"
                            variant={user.isTester ? 'outline' : 'secondary'}
                            size="sm"
                            disabled={isToggling && pendingUserId === user.id}
                            onClick={() => handleToggleTester(user)}
                            className={
                              user.isTester
                                ? 'border-violet-500/30 text-violet-700 hover:bg-violet-500/10 dark:text-violet-400'
                                : ''
                            }
                          >
                            {isToggling && pendingUserId === user.id
                              ? '…'
                              : user.isTester
                                ? 'Quitar'
                                : 'Hacer tester'}
                          </Button>
                        )}
                      </div>
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
