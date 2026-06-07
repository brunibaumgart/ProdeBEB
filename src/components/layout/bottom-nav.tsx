'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Grid3x3, Home, ShieldCheck, Trophy, User, Users } from 'lucide-react'

import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/fixture', label: 'Fixture', icon: CalendarDays },
  { href: '/grupos', label: 'Grupos', icon: Grid3x3 },
  { href: '/prode', label: 'Prode', icon: Trophy },
  { href: '/torneos', label: 'Torneos', icon: Users },
  { href: '/perfil', label: 'Perfil', icon: User },
]

interface BottomNavProps {
  isAdmin?: boolean
}

export function BottomNav({ isAdmin = false }: BottomNavProps) {
  const pathname = usePathname()

  const items = isAdmin
    ? [
        ...navItems.slice(0, 5),
        { href: '/admin', label: 'Admin', icon: ShieldCheck },
        navItems[5],
      ]
    : navItems

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-md md:hidden"
      aria-label="Navegación principal"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const isAdminLink = href === '/admin'

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-1.5 py-2.5 text-[10px] font-medium transition-colors',
                  isActive
                    ? isAdminLink
                      ? 'text-brand-gold'
                      : 'text-primary'
                    : isAdminLink
                      ? 'text-brand-gold/70 hover:text-brand-gold'
                      : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn('size-5', isActive && 'stroke-[2.5]')} aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
