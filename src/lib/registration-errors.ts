import type { CaptureResult } from 'posthog-js'

export const REGISTRATION_ERROR_EVENT = 'registration_failed'

const stages = {
  link_invalid: 'activation_link',
  link_expired: 'activation_link',
  link_account_missing: 'activation_link',
  link_check_failed: 'activation_link',
  display_name_invalid: 'form_validation',
  password_too_short: 'form_validation',
  passwords_do_not_match: 'form_validation',
  activation_input_invalid: 'activation_request',
  activation_request_failed: 'activation_request',
  password_update_failed: 'password_setup',
  profile_write_failed: 'profile_save',
  profile_not_saved: 'profile_save',
  profile_user_unavailable: 'profile_save',
  auto_login_failed: 'auto_login',
  registration_unexpected: 'registration',
} as const

export type RegistrationErrorCode = keyof typeof stages

export function minimizeRegistrationErrorEvent(event: CaptureResult | null): CaptureResult | null {
  if (event?.event !== REGISTRATION_ERROR_EVENT) return event

  const code: unknown = event.properties.error_code
  if (typeof code !== 'string' || !Object.hasOwn(stages, code)) return null

  // PostHog enriches captures before this hook. Keep only the two diagnostics
  // and use the event UUID as the required anonymous ID, with no person profile.
  return {
    event: event.event,
    uuid: event.uuid,
    timestamp: event.timestamp,
    properties: {
      stage: stages[code as RegistrationErrorCode],
      error_code: code,
      distinct_id: event.uuid,
      $process_person_profile: false,
      $geoip_disable: true,
    },
  }
}
