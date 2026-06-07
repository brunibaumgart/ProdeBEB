import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { BottomNav } from '@/components/layout/bottom-nav'
import { SiteHeader } from '@/components/layout/site-header'
import { isAdminClerkId } from '@/lib/auth/test-access'
import { ensureDbUser } from '@/lib/queries/users'

interface AppShellProps {
  children: React.ReactNode
  pathname?: string
}

export async function AppShell({ children, pathname }: AppShellProps) {
  const { userId } = await auth()
  const isAdmin = isAdminClerkId(userId)

  if (userId && pathname !== '/elegir-usuario') {
    const dbUser = await ensureDbUser()
    if (dbUser && !dbUser.hasChosenUsername) {
      redirect('/elegir-usuario')
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader pathname={pathname} isAdmin={isAdmin} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 md:pb-8">{children}</main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  )
}
