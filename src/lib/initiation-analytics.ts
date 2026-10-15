import type { InitiationOrderKind, InitiationStatus } from './initiation-types'

export const INITIATION_PAGE_VERSION = 'initiation-bottom-payment-v2-20261014'
export const INITIATION_UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const
export type InitiationAnalyticsContext = Partial<Record<typeof INITIATION_UTM_KEYS[number], string>> & {
  page_visit_id?: string
  is_internal_qa?: boolean
  disabled?: boolean
}

/** Only campaign labels and an opaque visit ID cross the checkout boundary. */
export function sanitizeInitiationAnalytics(input: unknown): InitiationAnalyticsContext {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  const source = input as Record<string, unknown>
  const result: InitiationAnalyticsContext = {}
  for (const key of INITIATION_UTM_KEYS) {
    const value = source[key]
    if (typeof value === 'string' && /^[a-zA-Z0-9 _.,:/+-]{1,160}$/.test(value)) result[key] = value
  }
  if (typeof source.page_visit_id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(source.page_visit_id)) result.page_visit_id = source.page_visit_id
  if (source.is_internal_qa === true) result.is_internal_qa = true
  if (source.disabled === true) result.disabled = true
  return result
}

export function initiationAnalyticsProperties(kind: InitiationOrderKind, context: unknown = {}) {
  const safe = sanitizeInitiationAnalytics(context)
  delete safe.disabled
  return {
    ...safe, page_version: INITIATION_PAGE_VERSION, batch: 'S26', order_kind: kind,
    payable_amount: kind === 'legacy_upgrade' ? 400 : 520,
    amount_minor: kind === 'legacy_upgrade' ? 40000 : 52000, currency: 'USD',
  }
}

export function initiationNextStep(status: InitiationStatus, calibrated: boolean) {
  return status === 'guest' ? 'login' : !calibrated ? 'calibration' : 'checkout'
}

/** Continuous foreground exposure; interruption restarts the full second. */
export function createPriceExposureGate(deps: {
  schedule: (callback: () => void, ms: number) => unknown
  cancel: (timer: unknown) => void
  stillVisible: () => boolean
  expose: () => void
}) {
  let timer: unknown = null
  let fired = false
  let disposed = false
  const stop = () => { if (timer !== null) deps.cancel(timer); timer = null }
  return {
    update(eligible: boolean) {
      if (disposed || fired) return
      if (!eligible) { stop(); return }
      if (timer !== null) return
      timer = deps.schedule(() => {
        timer = null
        if (!disposed && !fired && deps.stillVisible()) { fired = true; deps.expose() }
      }, 1000)
    },
    dispose() { disposed = true; stop() },
  }
}

export function visiblePriceRatio(rect: { left: number; top: number; right: number; bottom: number }, clip: { left: number; top: number; right: number; bottom: number }) {
  const area = Math.max(0, rect.right - rect.left) * Math.max(0, rect.bottom - rect.top)
  return area > 0 ? Math.max(0, Math.min(rect.right, clip.right) - Math.max(rect.left, clip.left))
    * Math.max(0, Math.min(rect.bottom, clip.bottom) - Math.max(rect.top, clip.top)) / area : 0
}
