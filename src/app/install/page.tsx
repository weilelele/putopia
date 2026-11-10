import type { Metadata } from 'next'
import { InstallPageClient } from './install-page-client'

export const metadata: Metadata = { title: 'Save Collective to your phone' }

export default async function InstallPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const { source } = await searchParams
  return <InstallPageClient source={source === 'email' ? 'email' : 'install_page'} />
}
