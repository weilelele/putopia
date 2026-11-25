import { shopifyCheckoutStages } from './shopify-customer-events'
import { shopifyDiagnosticEvents } from './shopify-checkout-diagnostics'

export const observationFailureReasons = ['missing_reference', 'invalid_reference', 'invalid_payload', 'binding_not_found',
  'reference_mismatch', 'event_time_rejected', 'storage_unavailable', 'ingest_rejected', 'network_failure'] as const
export type ObservationFailureReason = typeof observationFailureReasons[number]
const observedEvents = [...Object.keys(shopifyCheckoutStages), ...Object.keys(shopifyDiagnosticEvents), 'unknown']

export function observationEventName(value: unknown) {
  if (!value || typeof value !== 'object') return 'unknown'
  const event = (value as Record<string, unknown>).event
  return typeof event === 'string' && observedEvents.includes(event) ? event : 'unknown'
}

export function shopifyObservationRejection(value: unknown, now: number): ObservationFailureReason {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'invalid_payload'
  const input = value as Record<string, unknown>
  if (input.reference == null || input.reference === '') return 'missing_reference'
  if (typeof input.reference !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.[0-9a-f]{64}$/i.test(input.reference)) return 'invalid_reference'
  const time = typeof input.timestamp === 'string' ? Date.parse(input.timestamp) : NaN
  if (!Number.isFinite(time) || time > now + 60000 || time < now - 86400000) return 'event_time_rejected'
  return 'invalid_payload'
}

/** Unbound client reports are health counters, never a person, checkout, payment or conversion. */
export function parseShopifyObservationFailure(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const v = value as Record<string, unknown>
  if (v.event !== 'putopia_observation_failed' || v.pixel_version !== 3 || !v.properties || typeof v.properties !== 'object') return null
  const p = v.properties as Record<string, unknown>
  if (!['missing_reference', 'invalid_reference', 'invalid_payload', 'ingest_rejected', 'network_failure'].includes(String(p.reason))
    || !observedEvents.includes(String(p.observed_event))) return null
  return { reason: p.reason as ObservationFailureReason, observedEvent: String(p.observed_event) }
}

export async function recordShopifyObservationFailure(admin: ReturnType<typeof import('./supabase/server').createAdminClient>,
  source: 'pixel_unverified' | 'server', reason: ObservationFailureReason, event: string) {
  const { error } = await admin.rpc('record_shopify_observation_failure' as never, {
    p_source: source, p_reason: reason, p_event: observedEvents.includes(event) ? event : 'unknown',
  } as never).abortSignal(AbortSignal.timeout(3000))
  if (error) throw new Error('Shopify observation health counter unavailable')
}
