import type { Metadata } from 'next'
import { Orbitron, Raleway, DM_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { Sidebar } from '@/components/sidebar'
import { BottomNav } from '@/components/bottom-nav'

const orbitron = Orbitron({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['700', '800', '900'],
})

const raleway = Raleway({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

const dmMono = DM_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'PUTOPIA // COLLECTIVE — Internal Platform',
  description: 'Classified internal workspace. Authorized personnel only.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${orbitron.variable} ${raleway.variable} ${dmMono.variable} h-full`}>
      <body className="starfield flex h-full">
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
