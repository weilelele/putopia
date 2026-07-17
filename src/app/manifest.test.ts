import { describe, expect, it } from 'vitest'
import { PWA_MANIFEST } from '@/app/manifest'

describe('PWA manifest', () => {
  it('defines the Android standalone launch contract', () => {
    expect(PWA_MANIFEST).toMatchObject({
      id: '/',
      name: 'Multiverse Collective',
      short_name: 'Multiverse',
      start_url: '/console?source=pwa',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait-primary',
    })
  })

  it('provides the required standard and maskable icons', () => {
    expect(PWA_MANIFEST.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
    ]))
  })
})
