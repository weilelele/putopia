import { describe, expect, it } from 'vitest'
import {
  allowsUnregisteredViewer,
  isPublicPrimaryRoute,
  PUBLIC_PRIMARY_ROUTES,
  requiresRegistration,
  routeWithSearch,
} from './access-policy'

describe('primary route access policy', () => {
  it('opens every primary tab and the recorded-world archive to guests and incomplete registrations', () => {
    expect(PUBLIC_PRIMARY_ROUTES).toEqual(['/console', '/intel', '/devices', '/worlds/live', '/voyagers'])
    for (const route of [...PUBLIC_PRIMARY_ROUTES, '/worlds']) {
      for (const path of [route, `${route}/`]) {
        expect(allowsUnregisteredViewer(path)).toBe(true)
        expect(requiresRegistration(path)).toBe(false)
      }
    }
    for (const route of PUBLIC_PRIMARY_ROUTES) expect(isPublicPrimaryRoute(route)).toBe(true)
    expect(allowsUnregisteredViewer('/')).toBe(true)
    expect(allowsUnregisteredViewer('/welcome')).toBe(true)
  })

  it('retains the separate registration gate on supporting listings', () => {
    for (const route of ['/vote', '/logs']) expect(requiresRegistration(route)).toBe(true)
  })

  it('allows public reading without opening submissions, personal records or administration', () => {
    for (const route of ['/intel/example', '/worlds/example/', '/devices/batches/kyoto-one', '/devices/batches/kyoto-one/discussion']) {
      expect(allowsUnregisteredViewer(route)).toBe(true)
    }
    for (const route of ['/worlds/submit', '/worlds/submit/', '/devices/claim', '/devices/claim/success', '/devices/my-consoles', '/profile', '/admin', '/studio', '/intel-other', '/devices/batches/one/edit']) {
      expect(allowsUnregisteredViewer(route)).toBe(false)
    }
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
