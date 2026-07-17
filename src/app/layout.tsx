import type { Metadata } from 'next'
import { Courier_Prime } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { Sidebar } from '@/components/sidebar'
import { BottomNav } from '@/components/bottom-nav'
import { ScrollRestorer } from '@/components/scroll-restorer'
import { PwaProvider } from '@/components/pwa-provider'

const courierPrime = Courier_Prime({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '700'],
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
