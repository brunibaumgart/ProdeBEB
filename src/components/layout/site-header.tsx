import Link from 'next/link'
import { Show, SignInButton } from '@clerk/nextjs'
import { ShieldCheck } from 'lucide-react'

import { UserAvatarLink } from '@/components/layout/user-avatar-link'
import { cn } from '@/lib/utils'

const publicLinks = [
  { href: '/fixture', label: 'Fixture' },
  { href: '/grupos', label: 'Grupos' },
  { href: '/estadisticas', label: 'Estadísticas' },
  { href: '/selecciones', label: 'Selecciones' },
  { href: '/estadios', label: 'Estadios' },
]

interface SiteHeaderProps {
  pathname?: string
  isAdmin?: boolean
}

export function SiteHeader({ pathname = '/', isAdmin = false }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary font-heading text-lg text-primary-foreground">
            P
          </span>
          <span className="hidden font-heading text-xl tracking-wide text-foreground sm:inline">
            PRODEBEB
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación desktop">
          {publicLinks.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`)

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                {label}
              </Link>
            )
          })}
          <Show when="signed-in">
            <Link
              href="/prode"
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname.startsWith('/prode')
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              Prode
            </Link>
            <Link
              href="/torneos"
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname.startsWith('/torneos')
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              Torneos
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname.startsWith('/admin')
                    ? 'bg-brand-gold/20 text-brand-gold'
                    : 'text-muted-foreground hover:bg-brand-gold/10 hover:text-brand-gold'
                )}
              >
                <ShieldCheck className="size-4" aria-hidden />
                Admin
              </Link>
            )}
          </Show>
        </nav>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                'inline-flex size-9 items-center justify-center rounded-lg transition-colors md:hidden',
                pathname.startsWith('/admin')
                  ? 'bg-brand-gold/20 text-brand-gold'
                  : 'text-muted-foreground hover:bg-brand-gold/10 hover:text-brand-gold'
              )}
              aria-label="Panel de administración"
            >
              <ShieldCheck className="size-5" aria-hidden />
            </Link>
          )}
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                Ingresar
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserAvatarLink />
          </Show>
        </div>
      </div>
    </header>
  )
}
