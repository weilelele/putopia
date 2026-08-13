import type { PushSendResult } from './apns'

export interface PushTestDiagnostic {
  status: number
  message: string
  nextStep?: string
}

export function diagnosePushTest(result: PushSendResult): PushTestDiagnostic {
  if (result.delivered > 0) {
    return { status: 200, message: 'Push delivered to a registered iPhone.' }
  }

  switch (result.reason) {
    case 'not_configured':
      return {
        status: 503,
        message: 'Apple Push credentials are not configured correctly.',
        nextStep: 'Check the encrypted APNS_* variables in the deployment environment.',
      }
    case 'storage_unavailable':
      return {
        status: 503,
        message: 'Push notification storage is unavailable.',
        nextStep: 'Apply supabase/schema_v57.sql to the production Supabase project.',
      }
    case 'no_registered_devices':
      return {
        status: 409,
        message: 'No iPhone is registered for this account.',
        nextStep: 'Open the latest TestFlight build, sign in, allow notifications, then retry.',
      }
    case 'provider_rejected':
      return {
        status: 502,
        message: 'Apple rejected or could not deliver the notification.',
        nextStep: 'Confirm the TestFlight build uses the production APNs entitlement and inspect the delivery log.',
      }
    case 'preferences_disabled':
      return { status: 409, message: 'This notification category is disabled for the account.' }
    default:
      return {
        status: 502,
        message: 'The notification was not delivered.',
        nextStep: 'Inspect the server logs and push delivery log.',
      }
  }
}
