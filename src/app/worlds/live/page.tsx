import type { Metadata } from 'next'
import { WorldsLiveRoom } from './worlds-live-room'
import { listDreamcatcherRooms } from '@/lib/dreamcatchers'
import { getInvestigationFeed } from '@/lib/actions/signal-tasks'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Worlds Live Room — Multiverse Collective',
  description: 'Portrait-first Dreamcatcher live observation prototype.',
}

export default async function WorldsLivePage() {
  const [rooms, feed] = await Promise.all([
    listDreamcatcherRooms().catch(() => []),
    getInvestigationFeed().catch(() => ({ investigations: [], role: null, loggedIn: false })),
  ])
  return (
    <WorldsLiveRoom
      investigations={feed.investigations}
      loggedIn={feed.loggedIn}
      rooms={rooms}
    />
  )
}
