'use client'

import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'

export default function DreamcatcherAdminError({ reset }: { reset: () => void }) {
  return <ArchiveCard className="p-6" role="alert"><h2>DREAMCATCHERS UNAVAILABLE</h2><p className="my-4">Check your administrator access and connection, then try again.</p><ArchiveButton onClick={reset}>TRY AGAIN</ArchiveButton></ArchiveCard>
}
