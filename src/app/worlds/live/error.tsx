'use client'

import { ArchiveButton } from '@/components/archive-button'

export default function DreamcatcherRoomError({ reset }: { reset: () => void }) {
  return <main className="main p-6" role="alert"><h1>WORLDS</h1><p className="my-4">Dreamcatchers could not be loaded. Please try again.</p><ArchiveButton onClick={reset}>TRY AGAIN</ArchiveButton></main>
}
