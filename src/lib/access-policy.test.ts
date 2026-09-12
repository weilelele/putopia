import { describe, expect, it } from 'vitest'
import {
  allowsUnregisteredViewer,
  isPublicPrimaryRoute,
  PUBLIC_PRIMARY_ROUTES,
  REGISTERED_PRIMARY_ROUTES,
  requiresRegistration,
  routeWithSearch,
} from './access-policy'

describe('primary route access policy', () => {
  it('opens Dashboard and Devices to every viewer', () => {
    expect(PUBLIC_PRIMARY_ROUTES).toEqual(['/console', '/devices'])
    expect(isPublicPrimaryRoute('/console')).toBe(true)
    expect(isPublicPrimaryRoute('/devices/')).toBe(true)
    expect(allowsUnregisteredViewer('/')).toBe(true)
    expect(allowsUnregisteredViewer('/welcome')).toBe(true)
  })

  it('requires registration for the other three primary tabs', () => {
    expect(REGISTERED_PRIMARY_ROUTES).toEqual(['/intel', '/worlds/live', '/voyagers'])
    for (const route of REGISTERED_PRIMARY_ROUTES) expect(requiresRegistration(route)).toBe(true)
  })

  it('does not broaden a root-page decision to sensitive or unrelated routes', () => {
    expect(isPublicPrimaryRoute('/devices/claim')).toBe(false)
    expect(requiresRegistration('/intel/example')).toBe(false)
    expect(requiresRegistration('/devices')).toBe(false)
  })

  it('preserves the intended query when routing through access screens', () => {
    expect(routeWithSearch('/worlds/live', '?mode=queue')).toBe('/worlds/live?mode=queue')
  })
})
