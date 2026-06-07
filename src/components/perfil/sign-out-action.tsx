'use client'

import { SignOutButton } from '@clerk/nextjs'
import { LogOut } from 'lucide-react'

export function SignOutAction() {
  return (
    <SignOutButton>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="size-4" aria-hidden />
        Cerrar sesión
      </button>
    </SignOutButton>
  )
}
