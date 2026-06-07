'use client'

import Link from 'next/link'
import { useUser } from '@clerk/nextjs'

import { UserInitialAvatar } from '@/components/ui/user-initial-avatar'
import { cn } from '@/lib/utils'

interface UserAvatarLinkProps {
  className?: string
}

export function UserAvatarLink({ className }: UserAvatarLinkProps) {
  const { user, isLoaded } = useUser()

  if (!isLoaded || !user) return null

  const displayName = user.fullName ?? user.firstName ?? user.username ?? 'Usuario'

  return (
    <Link
      href="/perfil"
      aria-label="Ir a mi perfil"
      className={cn(
        'flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full transition-opacity hover:opacity-80',
        className,
      )}
    >
      <UserInitialAvatar name={displayName} size="md" className="size-full" />
    </Link>
  )
}
