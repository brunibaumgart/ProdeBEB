import type { Metadata } from 'next'
import { Inter, Bebas_Neue } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'sonner'
import './globals.css'
import 'flag-icons/css/flag-icons.min.css'

import { getSiteUrl } from '@/lib/site-url'
import { PullToRefresh } from '@/components/layout/pull-to-refresh'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const bebasNeue = Bebas_Neue({
  variable: '--font-bebas',
  subsets: ['latin'],
  weight: '400',
})

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: 'ProdeBEB — Mundial 2026',
    template: '%s · ProdeBEB',
  },
  description: 'El prode del Mundial 2026. Predecí, competí y seguí el torneo en tiempo real.',
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: 'ProdeBEB',
    title: 'ProdeBEB — Mundial 2026',
    description: 'El prode del Mundial 2026. Predecí, competí y seguí el torneo en tiempo real.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ProdeBEB — Mundial 2026',
    description: 'El prode del Mundial 2026. Predecí, competí y seguí el torneo en tiempo real.',
  },
  icons: {
    icon: [{ url: '/icon', type: 'image/png' }],
    apple: [{ url: '/apple-icon', type: 'image/png' }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html
        lang="es"
        className={`${inter.variable} ${bebasNeue.variable} dark h-full`}
        suppressHydrationWarning
      >
        <body className="min-h-full bg-background text-foreground antialiased">
          <PullToRefresh>{children}</PullToRefresh>
          <Toaster richColors closeButton position="top-center" />
        </body>
      </html>
    </ClerkProvider>
  )
}
