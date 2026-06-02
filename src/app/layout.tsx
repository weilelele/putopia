import type { Metadata } from 'next'
import { Space_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { Sidebar } from '@/components/sidebar'
import { BottomNav } from '@/components/bottom-nav'

const spaceMono = Space_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '700'],
})

export const metadata: Metadata = {
  title: 'MULTIVERSE COLLECTIVE — Explore Parallel Worlds',
  description: 'Classified internal workspace. Authorized personnel only.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${spaceMono.variable} h-full`}>
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
        <AuthProvider>
          <div className="app-shell w-full">
            <Sidebar />
            {children}
          </div>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  )
}
