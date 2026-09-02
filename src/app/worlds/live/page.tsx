import type { Metadata } from 'next'
import { WorldsLiveRoom } from './worlds-live-room'
import { listDreamcatcherRooms } from '@/lib/dreamcatchers'
import { getInvestigationFeed } from '@/lib/actions/signal-tasks'
import {
  DREAMCATCHER_LIVE_VIDEO_SOURCE,
  getDreamcatcherLiveVideoLibrary,
} from '@/lib/cosmo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Worlds Live Room — Multiverse Collective',
  description: 'Portrait-first Dreamcatcher live observation prototype.',
}

export default async function WorldsLivePage() {
  const [rooms, feed, liveVideoLibrary] = await Promise.all([
    listDreamcatcherRooms().catch(() => []),
    getInvestigationFeed().catch(() => ({ investigations: [], role: null, loggedIn: false })),
    getDreamcatcherLiveVideoLibrary().catch(() => null),
  ])
  return (
    <WorldsLiveRoom
      investigations={feed.investigations}
      liveVideoLibrary={liveVideoLibrary}
      liveVideoRoomSlug={DREAMCATCHER_LIVE_VIDEO_SOURCE.roomSlug}
      loggedIn={feed.loggedIn}
      rooms={rooms}
    />
  )
}
