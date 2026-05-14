import type { Metadata } from 'next'
import { Geist_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { Nav } from '@/components/nav'
import { BottomNav } from '@/components/bottom-nav'

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
    <html lang="en" className={`${geistMono.variable} h-full`}>
      <body className="flex h-full" style={{ background: '#0F0A00' }}>
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
