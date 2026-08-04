import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '平行世界观测组织｜Limited Investor Briefing',
  description: 'A limited-access briefing from the Multiverse Collective.',
  robots: { index: false, follow: false },
}

export default function InvestorDeckLayout({ children }: { children: React.ReactNode }) {
  return children
}
