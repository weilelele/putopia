import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import Script from 'next/script'
import './globals.css'
import './visual-refresh.css'
import { AuthProvider } from '@/lib/auth-context'
import { Sidebar } from '@/components/sidebar'
import { BottomNav } from '@/components/bottom-nav'
import { ScrollRestorer } from '@/components/scroll-restorer'
import { PwaProvider } from '@/components/pwa-provider'
import { REDDIT_PIXEL_ID } from '@/lib/reddit-ads-config'

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
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window,document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','993248870105581');
          fbq('track','PageView');
        `}</Script>
        <Script id="x-pixel" strategy="afterInteractive">{`
          !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
          },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
          a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
          twq('config','rd22u');
        `}</Script>
        <Script id="reddit-pixel" strategy="afterInteractive">{`
          !function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js?pixel_id=${REDDIT_PIXEL_ID}",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);rdt('init','${REDDIT_PIXEL_ID}');rdt('track', 'PageVisit');
        `}</Script>
        <PwaProvider>
          <AuthProvider>
            <ScrollRestorer />
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
