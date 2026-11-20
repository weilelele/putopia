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
import { SiteCalibrationReminder } from '@/components/site-calibration-reminder'
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_SHARE_DESCRIPTION, SITE_URL, organizationJsonLd, serializeJsonLd } from '@/lib/site-seo'

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
  metadataBase: new URL(SITE_URL),
  title: 'MULTIVERSE COLLECTIVE — Explore Parallel Worlds',
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: 'Multiverse Collective',
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: 'Multiverse Collective — Explore Parallel Worlds',
    description: SITE_SHARE_DESCRIPTION,
    images: [{ url: '/assets/device-console.jpg', width: 1280, height: 1023, alt: 'Rendering of the Multiverse Console, a retro sci-fi device with tuning dials' }],
  },
  twitter: { card: 'summary_large_image' },
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationJsonLd()) }} />
        <AdPixels />
        <PwaProvider>
          <AuthProvider>
            <Suspense fallback={null}><ScrollRestorer /></Suspense>
            <div className="app-shell w-full">
              <Sidebar />
              {children}
            </div>
            <BottomNav />
            <Suspense fallback={null}><SiteCalibrationReminder environment={process.env.VERCEL_ENV ?? 'unknown'} /></Suspense>
          </AuthProvider>
        </PwaProvider>
      </body>
    </html>
  )
}
