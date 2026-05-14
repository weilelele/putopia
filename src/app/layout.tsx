import type { Metadata } from 'next'
import { Orbitron, Raleway, DM_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { Nav } from '@/components/nav'
import { BottomNav } from '@/components/bottom-nav'

const orbitron = Orbitron({
  variable: '--font-orbitron',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
})

const raleway = Raleway({
  variable: '--font-raleway',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
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
      <body className="flex h-full">
        <AuthProvider>
          <Nav />
          <main className="flex-1 overflow-y-auto min-h-screen pb-16 md:pb-0">
            {children}
          </main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  )
}
