import { describe, expect, it } from 'vitest'
import {
  MAX_RECENT_CHANNELS,
  addRecentOfflineVisit,
  offlineChannelForRoute,
  parseOfflineVisits,
} from './offline'

describe('iOS offline field archive', () => {
  it('stores only fixed, allowlisted top-level channels', () => {
    expect(offlineChannelForRoute('/worlds/private-record?token=secret')).toMatchObject({
      route: '/worlds',
      label: 'WORLD RECORDS',
    })
    expect(offlineChannelForRoute('/profile')).toBeNull()
    expect(offlineChannelForRoute('https://evil.example/worlds')).toBeNull()
  })

  it('deduplicates channels and limits the archive size', () => {
    const routes = ['/console', '/intel', '/devices', '/worlds', '/voyagers']
    const visits = routes.reduce((current, route, index) => {
      const channel = offlineChannelForRoute(route)
      if (!channel) return current
      return addRecentOfflineVisit(current, channel, `2026-08-0${index + 1}T12:00:00.000Z`)
    }, [] as ReturnType<typeof addRecentOfflineVisit>)

    expect(visits).toHaveLength(MAX_RECENT_CHANNELS)
    expect(visits.map((visit) => visit.route)).toEqual([
      '/voyagers',
      '/worlds',
      '/devices',
      '/intel',
    ])
  })

  it('rebuilds labels from the allowlist and rejects private or malformed entries', () => {
    const parsed = parseOfflineVisits(JSON.stringify([
      {
        route: '/intel/article-id?private=true',
        label: 'ATTACKER CONTROLLED LABEL',
        description: 'PRIVATE CONTENT',
        visitedAt: '2026-08-07T12:00:00.000Z',
      },
      { route: '/profile', visitedAt: '2026-08-07T12:00:00.000Z' },
      { route: '/worlds', visitedAt: 'not-a-date' },
    ]))

    expect(parsed).toEqual([{
      route: '/intel',
      label: 'INTEL FEED',
      description: 'Receive the latest field intelligence when the uplink returns.',
      visitedAt: '2026-08-07T12:00:00.000Z',
    }])
  })
})
