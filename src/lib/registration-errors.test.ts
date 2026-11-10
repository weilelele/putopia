import type { CaptureResult } from 'posthog-js'
import { describe, expect, it } from 'vitest'
import { minimizeRegistrationErrorEvent, REGISTRATION_ERROR_EVENT } from './registration-errors'

const event: CaptureResult = {
  event: REGISTRATION_ERROR_EVENT,
  uuid: 'event-id',
  timestamp: new Date('2026-11-03T00:00:00Z'),
  properties: {
    error_code: 'password_update_failed',
    stage: 'untrusted stage',
    distinct_id: 'account-id',
    $session_id: 'session-id',
    $current_url: 'https://fixture.example/register?key=private',
    $referrer: 'https://fixture.example/register?key=private',
    display_name: 'fixture name',
    password: 'fixture-password',
  },
  $set: { email: 'fixture@example.com' },
  $set_once: { $initial_current_url: 'https://fixture.example/register?key=private' },
}

describe('registration error event privacy', () => {
  it('discards SDK context and any extra input, keeping only the allowlisted diagnostics', () => {
    expect(minimizeRegistrationErrorEvent(event)).toEqual({
      event: REGISTRATION_ERROR_EVENT,
      uuid: 'event-id',
      timestamp: event.timestamp,
      properties: {
        stage: 'password_setup',
        error_code: 'password_update_failed',
        distinct_id: 'event-id',
        $process_person_profile: false,
        $geoip_disable: true,
      },
    })
  })

  it.each(['provider sent private text', 'constructor', undefined])('drops an unrecognized error code', error_code => {
    expect(minimizeRegistrationErrorEvent({ ...event, properties: { error_code } })).toBeNull()
  })

  it('passes unrelated events through', () => {
    const pageview = { ...event, event: '$pageview' }
    expect(minimizeRegistrationErrorEvent(pageview)).toBe(pageview)
  })
})
