import { AppShell } from '@/components/layout/app-shell'
import { Skeleton } from '@/components/ui/skeleton'

interface PageLoadingProps {
  pathname: string
  titleWidth?: string
}

export function PageLoading({ pathname, titleWidth = 'w-48' }: PageLoadingProps) {
  return (
    <AppShell pathname={pathname}>
      <Skeleton className={`mb-2 h-9 ${titleWidth}`} />
      <Skeleton className="mb-8 h-5 w-72 max-w-full" />
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    </AppShell>
  )
}

export function GruposPageLoading() {
  return (
    <AppShell pathname="/grupos">
      <Skeleton className="mb-2 h-9 w-32" />
      <Skeleton className="mb-8 h-5 w-96 max-w-full" />
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    </AppShell>
  )
}

export function FixturePageLoading() {
  return (
    <AppShell pathname="/fixture">
      <Skeleton className="mb-2 h-9 w-36" />
      <Skeleton className="mb-6 h-5 w-56" />
      <Skeleton className="mb-8 h-10 w-full rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    </AppShell>
  )
}
