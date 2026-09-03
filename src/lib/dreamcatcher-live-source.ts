import 'server-only'

import { unstable_cache } from 'next/cache'
import { getBandAssets, getFrequency } from '@/lib/cosmo'
import { emptyDreamcatcherLiveVideoLibrary, groupDreamcatcherLiveVideos } from '@/lib/dreamcatcher-live'

// The existing Console channel, not an OBS stream. Keep the editorial source
// separate from the device's runtime status and submission ownership.
export const DREAMCATCHER_LIVE_VIDEO_SOURCE = {
  roomSlug: 'london-01',
  channelId: '6a85654041b16262cb633ac7',
  bandId: '6a85655f41b16262cb633aef',
} as const

// This app has not enabled Cache Components. Use its existing Data Cache API;
// cache only public media metadata, never authenticated room/job data.
export const getDreamcatcherLiveVideoLibrary = unstable_cache(
  async () => {
    const { channelId, bandId } = DREAMCATCHER_LIVE_VIDEO_SOURCE
    const channel = await getFrequency(channelId)
    if (!channel?.bands.some((band) => band.bandId === bandId && band.enabled)) {
      return emptyDreamcatcherLiveVideoLibrary()
    }
    return groupDreamcatcherLiveVideos(await getBandAssets(channelId, bandId, 'video'))
  },
  ['dreamcatcher-state-videos', DREAMCATCHER_LIVE_VIDEO_SOURCE.channelId, DREAMCATCHER_LIVE_VIDEO_SOURCE.bandId],
  { revalidate: 60 },
)
