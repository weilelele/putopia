import type { Metadata } from 'next'
import { WorldsLiveRoom } from './worlds-live-room'
import { listDreamcatcherRooms } from '@/lib/dreamcatchers'
import { getInvestigationFeed } from '@/lib/actions/signal-tasks'
import { DREAMCATCHER_LIVE_VIDEO_SOURCE, getDreamcatcherLiveVideoLibrary } from '@/lib/dreamcatcher-live-source'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Worlds Live Room — Multiverse Collective',
  description: 'Observe Dreamcatcher state feeds, submit dreams, and follow Signal Dispatch.',
}

export default async function WorldsLivePage() {
  const [rooms, feed, liveVideoLibrary] = await Promise.all([
    listDreamcatcherRooms(),
    getInvestigationFeed().catch(() => ({ investigations: [], role: null, loggedIn: false })),
    getDreamcatcherLiveVideoLibrary().catch(() => {
      console.warn('[worlds/live] Console state video library unavailable')
      return null
    }),
  ])
  return (
    <WorldsLiveRoom
      key={rooms.map((room) => room.id).join(',')}
      investigations={feed.investigations}
      liveVideoLibrary={liveVideoLibrary}
      liveVideoRoomSlug={DREAMCATCHER_LIVE_VIDEO_SOURCE.roomSlug}
      loggedIn={feed.loggedIn}
      rooms={rooms}
    />
  )
}
