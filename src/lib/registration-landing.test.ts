import { describe, expect, it } from 'vitest'
import { ACTIVATION_WELCOME_PATH, registrationLandingPath } from './registration-landing'

const ORIGIN = 'https://multiverseco.org'

describe('registration landing', () => {
  it('opens the activation welcome for default, unsafe and auth-loop destinations', () => {
    for (const path of [null, '', '/console', '/console?from=signup', '/login', '/register?key=secret', '/register/complete', '/auth/callback', 'https://other.example/steal', '//other.example']) {
      expect(registrationLandingPath(path, ORIGIN)).toBe(ACTIVATION_WELCOME_PATH)
    }
  })

  it('preserves explicit checkout, calibration and participation return paths', () => {
    for (const path of ['/voyager-initiation', '/voyager-initiation?bundle=standard&from=%2Fdevices%2Fbatches%2Fone', '/join/success?session_id=cs_example', '/devices/claim?device=one', '/intel/example']) {
      expect(registrationLandingPath(path, ORIGIN)).toBe(path)
    }
    expect(registrationLandingPath(`${ORIGIN}/voyager-initiation?bundle=initial`, ORIGIN)).toBe('/voyager-initiation?bundle=initial')
    expect(registrationLandingPath('https://other.example', ORIGIN, '/voyager-initiation?bundle=standard')).toBe('/voyager-initiation?bundle=standard')
  })
})
