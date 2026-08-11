import { describe, expect, it } from 'vitest'
import {
  collectOfflineMediaUrls,
  parseOfflineMediaMap,
  parseOfflineSnapshot,
  shouldShowOffline,
  type OfflineSnapshot,
} from './offline'

const snapshot: OfflineSnapshot = {
  version: 2,
  syncedAt: '2026-08-10T12:00:00.000Z',
  viewer: { authenticated: true, role: 'voyager', displayName: 'Mira' },
  worlds: [{
    id: 'W-1', name: '镜像', name_en: 'Mirror', description: 'A confirmed world.',
    image_path: 'https://cdn.example/world.webp', gradient_from: '#000000', gradient_to: '#111111',
    lifecycle_state: 'stable', discoverer_name: 'Mira', discovery_date: '2026-08-01',
    submitted_at: null, created_at: '2026-08-01T00:00:00.000Z',
  }],
  devices: [],
  intel: [{
    id: 'I-1', title: 'Signal confirmed', content: 'Public dispatch.', timestamp: '2026-08-09T00:00:00.000Z',
    tag: 'NOTICE', images: ['https://cdn.example/intel.webp'], publisher_name: 'Architect',
    created_at: '2026-08-09T00:00:00.000Z',
  }],
  voyagers: [],
  stories: [],
  votes: [],
  functions: [],
}

describe('iOS full offline snapshot', () => {
  it('keeps the original app visible whenever the device is online', () => {
    expect(shouldShowOffline('online', false)).toBe(false)
    expect(shouldShowOffline('online', true)).toBe(false)
    expect(shouldShowOffline('offline', false)).toBe(true)
    expect(shouldShowOffline('unknown', true)).toBe(true)
  })

  it('accepts a versioned snapshot and rejects malformed or stale payloads', () => {
    expect(parseOfflineSnapshot(JSON.stringify(snapshot))).toEqual(snapshot)
    expect(parseOfflineSnapshot({ ...snapshot, version: 1 })).toBeNull()
    expect(parseOfflineSnapshot({ ...snapshot, syncedAt: 'invalid' })).toBeNull()
    expect(parseOfflineSnapshot({ ...snapshot, viewer: { role: 'admin', authenticated: true } })).toBeNull()
    expect(parseOfflineSnapshot({ ...snapshot, intel: 'not-an-array' })).toBeNull()
  })

  it('collects and deduplicates only HTTPS media URLs', () => {
    const withDuplicates: OfflineSnapshot = {
      ...snapshot,
      devices: [{
        id: 'D-1', name: 'Console', batch_id: null, knowledge: 'known', location: 'Berlin',
        description: 'Device', image_path: 'https://cdn.example/world.webp', status: 'in_use',
        current_user_name: null, exploration_progress: 100, updated_at: '2026-08-10T00:00:00.000Z',
      }],
    }
    expect(collectOfflineMediaUrls(withDuplicates)).toEqual([
      'https://cdn.example/world.webp',
      'https://cdn.example/intel.webp',
    ])
  })

  it('keeps only valid remote-to-local media mappings', () => {
    expect(parseOfflineMediaMap(JSON.stringify({
      'https://cdn.example/a.webp': 'file:///cache/a.webp',
      'http://cdn.example/b.webp': 'file:///cache/b.webp',
      'https://cdn.example/c.webp': '/cache/c.webp',
    }))).toEqual({
      'https://cdn.example/a.webp': 'file:///cache/a.webp',
    })
  })
})
