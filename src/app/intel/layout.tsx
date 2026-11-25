import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Intel · Multiverse Collective',
  description: 'Field reports, transmissions and announcements from Multiverse Collective, the hardware-based sci-fi game about looking into parallel worlds with the Multiverse Console.',
}

export default function IntelLayout({ children }: { children: React.ReactNode }) {
  return children
}
