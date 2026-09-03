import { describe, expect, it } from 'vitest'
import type { CosmoAsset } from '@/lib/cosmo'
import {
  advanceDreamcatcherPlayback,
  advanceDreamcatcherSteadyVideo,
  dreamcatcherReconnectDelay,
  groupDreamcatcherLiveVideos,
  isDreamcatcherWorking,
  syncDreamcatcherPlaybackToState,
} from '@/lib/dreamcatcher-live'

function video(assetId: string, tags: string[]): CosmoAsset {
  return { assetId, media: 'video', url: `https://example.com/${assetId}.mp4`, tags }
}

describe('groupDreamcatcherLiveVideos', () => {
  it('maps the current Cosmo tag vocabulary into the four playback phases', () => {
    const grouped = groupDreamcatcherLiveVideos([
      video('rest', ['日本捕梦仪，待机']),
      video('start', ['日本捕梦仪，开始工作']),
      video('work', ['日本捕梦仪，工作中']),
      video('stop', ['日本捕梦仪，结束工作']),
    ])

    expect(grouped.resting.map((asset) => asset.assetId)).toEqual(['rest'])
    expect(grouped.starting.map((asset) => asset.assetId)).toEqual(['start'])
    expect(grouped.working.map((asset) => asset.assetId)).toEqual(['work'])
    expect(grouped.stopping.map((asset) => asset.assetId)).toEqual(['stop'])
  })

  it('also accepts the product-language aliases for resting and entering work', () => {
    const grouped = groupDreamcatcherLiveVideos([
      video('rest', ['休息中']),
      video('start', ['进入工作']),
    ])

    expect(grouped.resting).toHaveLength(1)
    expect(grouped.starting).toHaveLength(1)
  })

  it('ignores images, missing URLs, and unrelated tags', () => {
    const grouped = groupDreamcatcherLiveVideos([
      { ...video('image', ['工作中']), media: 'image' },
      { ...video('missing', ['工作中']), url: '' },
      video('unrelated', ['风景']),
    ])
    expect(Object.values(grouped).flat()).toEqual([])
  })
})

describe('isDreamcatcherWorking', () => {
  it('uses either the room state or an active search job as the working signal', () => {
    expect(isDreamcatcherWorking('processing', [])).toBe(true)
    expect(isDreamcatcherWorking('idle', [{ status: 'processing' }])).toBe(true)
    expect(isDreamcatcherWorking('idle', [{ status: 'queued' }])).toBe(false)
  })
})

describe('advanceDreamcatcherPlayback', () => {
  const library = groupDreamcatcherLiveVideos([
    video('rest', ['待机']),
    video('start', ['开始工作']),
    video('work-a', ['工作中']),
    video('work-b', ['工作中']),
    video('stop', ['结束工作']),
  ])

  it('plays each transition once between the two looping states', () => {
    const starting = advanceDreamcatcherPlayback({ phase: 'resting', index: 0, sequence: 0 }, true, library)
    expect(starting.phase).toBe('starting')

    const working = advanceDreamcatcherPlayback(starting, true, library)
    expect(working.phase).toBe('working')

    const stopping = advanceDreamcatcherPlayback(working, false, library)
    expect(stopping.phase).toBe('stopping')

    const resting = advanceDreamcatcherPlayback(stopping, false, library)
    expect(resting.phase).toBe('resting')
  })

  it('keeps the same steady-state video mounted for native seamless looping', () => {
    const next = advanceDreamcatcherPlayback({ phase: 'working', index: 0, sequence: 0 }, true, library)
    expect(next).toEqual({ phase: 'working', index: 0, sequence: 0 })
  })

  it('skips missing transition clips without stalling the steady loop', () => {
    const noTransitions = { ...library, starting: [], stopping: [] }
    const work = advanceDreamcatcherPlayback({ phase: 'resting', index: 0, sequence: 0 }, true, noTransitions)
    expect(work.phase).toBe('working')
    expect(advanceDreamcatcherPlayback(work, false, noTransitions).phase).toBe('resting')
  })

  it('settles to the latest device state after a rapid reversal mid-transition', () => {
    const starting = { phase: 'starting', index: 0, sequence: 1 } as const
    expect(syncDreamcatcherPlaybackToState(starting, false, library)).toBe(starting)
    expect(advanceDreamcatcherPlayback(starting, false, library).phase).toBe('resting')
    const stopping = { phase: 'stopping', index: 0, sequence: 2 } as const
    expect(syncDreamcatcherPlaybackToState(stopping, true, library)).toBe(stopping)
    expect(advanceDreamcatcherPlayback(stopping, true, library).phase).toBe('working')
  })
})

describe('steady-state signal reconnection', () => {
  const library = groupDreamcatcherLiveVideos([
    video('rest-a', ['待机']),
    video('rest-b', ['待机']),
    video('work-a', ['工作中']),
    video('work-b', ['工作中']),
  ])

  it('rotates to the next steady-state clip without replaying a transition', () => {
    expect(
      advanceDreamcatcherSteadyVideo(
        { phase: 'working', index: 0, sequence: 3 },
        library,
      ),
    ).toEqual({ phase: 'working', index: 1, sequence: 4 })
  })

  it('wraps the editorial pool and leaves transition clips untouched', () => {
    expect(
      advanceDreamcatcherSteadyVideo(
        { phase: 'resting', index: 1, sequence: 4 },
        library,
      ),
    ).toEqual({ phase: 'resting', index: 0, sequence: 5 })

    const transition = { phase: 'starting', index: 0, sequence: 2 } as const
    expect(advanceDreamcatcherSteadyVideo(transition, library)).toBe(transition)
  })

  it('keeps reconnect intervals inside the 45–90 second window', () => {
    expect(dreamcatcherReconnectDelay(-1)).toBe(45_000)
    expect(dreamcatcherReconnectDelay(0.5)).toBe(67_500)
    expect(dreamcatcherReconnectDelay(2)).toBe(90_000)
  })

  it('does not remount a single-video or unavailable pool', () => {
    const cursor = { phase: 'resting', index: 0, sequence: 1 } as const
    expect(advanceDreamcatcherSteadyVideo(cursor, null)).toBe(cursor)
    expect(advanceDreamcatcherSteadyVideo(cursor, { ...library, resting: [video('only', ['待机'])] })).toBe(cursor)
  })
})

describe('syncDreamcatcherPlaybackToState', () => {
  const library = groupDreamcatcherLiveVideos([
    video('rest', ['待机']),
    video('start', ['开始工作']),
    video('work', ['工作中']),
    video('stop', ['结束工作']),
  ])

  it('starts the one-shot transition when the device state changes', () => {
    expect(
      syncDreamcatcherPlaybackToState(
        { phase: 'resting', index: 0, sequence: 0 },
        true,
        library,
      ),
    ).toMatchObject({ phase: 'starting', sequence: 1 })
  })

  it('does not interrupt a transition that is already playing', () => {
    const current = { phase: 'starting', index: 0, sequence: 1 } as const
    expect(syncDreamcatcherPlaybackToState(current, true, library)).toBe(current)
  })

  it('does not restart playback on an unchanged status refresh', () => {
    const current = { phase: 'working', index: 3, sequence: 12 } as const
    expect(syncDreamcatcherPlaybackToState(current, true, library)).toBe(current)
  })

  it('recovers if an editorial refresh removes an in-flight transition', () => {
    const current = { phase: 'starting', index: 0, sequence: 1 } as const
    expect(syncDreamcatcherPlaybackToState(current, true, { ...library, starting: [] }).phase).toBe('working')
  })
})
