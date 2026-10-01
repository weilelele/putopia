import { Suspense } from 'react'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import './visual-refresh.css'
import { AuthProvider } from '@/lib/auth-context'
import { Sidebar } from '@/components/sidebar'
import { BottomNav } from '@/components/bottom-nav'
import { ScrollRestorer } from '@/components/scroll-restorer'
import { PwaProvider } from '@/components/pwa-provider'
import { AdPixels } from '@/components/ad-pixels'

const courierPrime = localFont({
  src: [
    {
      path: './fonts/courier-prime-regular-latin.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/courier-prime-bold-latin.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-mono',
  display: 'swap',
  fallback: ['Courier New', 'ui-monospace', 'monospace'],
  adjustFontFallback: false,
})

export const metadata: Metadata = {
  title: 'MULTIVERSE COLLECTIVE — Explore Parallel Worlds',
  description: 'Classified internal workspace. Authorized personnel only.',
  applicationName: 'Multiverse Collective',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Multiverse',
  },
}

export const viewport: Viewport = {
  themeColor: '#080C20',
  colorScheme: 'dark',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${courierPrime.variable} h-full`}>
      <body className="starfield flex h-full">
        <AdPixels />
        <PwaProvider>
          <AuthProvider>
            <Suspense fallback={null}><ScrollRestorer /></Suspense>
            <div className="app-shell w-full">
              <Sidebar />
              {children}
            </div>
            <BottomNav />
          </AuthProvider>
        </PwaProvider>
      </body>
    </html>
  )
}
