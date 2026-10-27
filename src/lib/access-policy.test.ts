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
    expect(PUBLIC_PRIMARY_ROUTES).toEqual(['/console', '/intel', '/devices', '/worlds', '/voyagers'])
    // /join/success: a buyer who signed up with an email code sees payment status before registering.
    for (const route of [...PUBLIC_PRIMARY_ROUTES, '/worlds/live', '/voyager-initiation', '/voyager-path', '/join/success']) {
      for (const path of [route, `${route}/`]) {
        expect(allowsUnregisteredViewer(path)).toBe(true)
        expect(requiresRegistration(path)).toBe(false)
      }
    }
    for (const route of PUBLIC_PRIMARY_ROUTES) expect(isPublicPrimaryRoute(route)).toBe(true)
    expect(allowsUnregisteredViewer('/')).toBe(true)
    expect(allowsUnregisteredViewer('/welcome')).toBe(true)
    expect(allowsUnregisteredViewer('/privacy')).toBe(true)
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

// Feed detail renders its own registration gate; server actions and RLS protect content.
describe('Voyager feed detail gate', () => {
  it('allows the shell while content remains protected', () => {
    expect(allowsUnregisteredViewer('/voyagers/posts/20000000-0000-4000-8000-000000000001')).toBe(true)
    expect(allowsUnregisteredViewer('/voyagers/posts/x/edit')).toBe(false)
  })
})
