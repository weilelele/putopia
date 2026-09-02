import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Multiverse Collective｜Investor Briefing',
  description: 'A sci-fi hardware game where fictional worlds break into real life.',
  robots: { index: false, follow: false },
}

export default function InvestorDeckLayout({ children }: { children: React.ReactNode }) {
  return children
}
