import { describe, expect, it } from 'vitest'
import { androidInstallUpdate, getInstallPlatform } from './android-install'

const android = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36'

describe('Android installation audience', () => {
  it('distinguishes Android browser access from app launches', () => {
    expect(getInstallPlatform(android, false)).toBe('android')
    expect(getInstallPlatform(android, true)).toBe('app')
    expect(getInstallPlatform('Mozilla/5.0 (iPhone) MultiverseCollective/1.0', false)).toBe('app')
    expect(getInstallPlatform('Mozilla/5.0 (iPhone) Safari/604.1', false)).toBe('other')
    expect(getInstallPlatform('Mozilla/5.0 (Macintosh) Chrome/130', false)).toBe('other')
  })

  it('uses the Shanghai calendar day across UTC midnight boundaries', () => {
    const entry = androidInstallUpdate(new Date('2026-10-28T17:00:00Z'))
    expect(entry.occurredAt).toBe('2026-10-29T00:00:00Z')
    expect(entry.href).toBe('/install')
    expect(entry.category).toBe('Intel')
    expect(entry.image).toBeUndefined()
    expect(entry.images).toBeUndefined()
    expect(androidInstallUpdate(new Date('2026-10-29T17:00:00Z')).occurredAt).toBe('2026-10-30T00:00:00Z')
  })
})
