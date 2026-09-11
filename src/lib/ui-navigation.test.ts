import { describe, expect, it } from 'vitest'
import { PRIMARY_NAV, ownerTab, hasGlobalNavigation, fallbackRoute, safeAppPath } from './ui-navigation'
describe('UI navigation contract', () => {
  it('keeps the same five primary destinations in order', () => {
    expect(PRIMARY_NAV.map(item => item.href)).toEqual(['/console', '/intel', '/devices', '/worlds/live', '/voyagers'])
  })
  it('preserves ownership for deep routes without matching similar prefixes', () => {
    expect(ownerTab('/logs/42')).toBe('/voyagers')
    expect(ownerTab('/profile')).toBe('/voyagers')
    expect(ownerTab('/worlds/42')).toBe('/worlds/live')
    expect(ownerTab('/worldflow')).toBe('/worlds/live')
    expect(ownerTab('/devices-unrelated')).toBeNull()
  })
  it('hides global navigation during focused tasks and launch', () => {
    for (const path of ['/welcome', '/vote', '/signal', '/devices/claim', '/worlds/submit']) expect(hasGlobalNavigation(path)).toBe(false)
    expect(hasGlobalNavigation('/logs/42')).toBe(true)
    expect(hasGlobalNavigation('/worldflow')).toBe(true)
  })
  it('keeps login escapable through the shared navigation without assigning a tab', () => {
    expect(hasGlobalNavigation('/login')).toBe(true)
    expect(ownerTab('/login')).toBeNull()
    expect(fallbackRoute('/login')).toBe('/console')
  })
  it('gives deep links stable parents and rejects external return targets', () => {
    expect(fallbackRoute('/logs/42')).toBe('/logs')
    expect(fallbackRoute('/devices/batches/one/discussion')).toBe('/devices/batches/one')
    expect(safeAppPath('https://other.test/console', 'https://mc.test')).toBeNull()
    expect(safeAppPath('/intel?tag=DEVICE', 'https://mc.test')).toBe('/intel?tag=DEVICE')
  })
})
