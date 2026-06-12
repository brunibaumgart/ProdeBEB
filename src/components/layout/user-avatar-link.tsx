'use client'

import Link from 'next/link'
import { useUser } from '@clerk/nextjs'

import { UserInitialAvatar } from '@/components/ui/user-initial-avatar'
import { cn } from '@/lib/utils'

interface UserAvatarLinkProps {
  className?: string
  prodeName?: string | null
}

export function UserAvatarLink({ className, prodeName }: UserAvatarLinkProps) {
  const { user, isLoaded } = useUser()

  if (!isLoaded || !user) return null

  const displayName = prodeName ?? user.username ?? 'Usuario'

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
