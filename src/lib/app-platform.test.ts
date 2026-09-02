import { describe, expect, it } from 'vitest'
import { isIOSNativeApp } from '@/lib/app-platform'

describe('isIOSNativeApp', () => {
  it('recognizes the iOS wrapper user-agent suffix', () => {
    expect(isIOSNativeApp(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) MultiverseCollective/1.0',
    )).toBe(true)
  })

  it('does not classify Android Chrome or Safari as the native iOS app', () => {
    expect(isIOSNativeApp(
      'Mozilla/5.0 (Linux; Android 17; Pixel 8) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36',
    )).toBe(false)
    expect(isIOSNativeApp(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1',
    )).toBe(false)
  })
})
