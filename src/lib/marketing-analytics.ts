import { createHash } from 'node:crypto'

// Explicit production allowlist: QA broadcasts must never enter campaign totals.
export const MARKETING_BROADCASTS = [
  { id: 'a5d7d659-7feb-4e9e-bed3-e7d161768cd6', content: 'p0_e_e1_v3' },
  { id: 'f44ae9b5-49ac-42d4-a410-0d53bbedba9c', content: 'p0_d2_e1_v3' },
  { id: 'cfae987f-6a69-4057-94cf-eb99c6bc3c9b', content: 'p0_d1_e1_v3' },
  { id: '3b52ddca-5bd4-438c-9b55-d207fd008129', content: 'p0_c2_e1_v3' },
  { id: 'ae4d03d1-578b-4188-a97a-d02591dcdf26', content: 'p0_c1_e1_v3' },
  { id: 'bc750e2b-49ad-46bc-a8ff-b0cb76c72c50', content: 'p0_a2_e2_v3' },
  { id: 'f581e817-fe09-4817-b633-babef9270422', content: 'p0_a1_e0_v3' },
] as const

export function analyticsEventId(key: string) {
  const hex = createHash('sha256').update(`marketing-analytics-v1:${key}`).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

export function deliveryCounts(row: Record<string, unknown>) {
  const result: Record<string, number> = {}
  for (const field of ['sent', 'delivered', 'bounced', 'unsubscribed']) {
    const value = row[field]
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      throw new Error(`Invalid Resend metric: ${field}`)
    }
    result[field] = value
  }
  return result
}

export type AnalyticsOrder = {
  id: string; user_id: string | null; amount: number; currency: string
  paid_at: string; stripe_session_id: string | null; device_batch_slug: string | null
}

export function verifiedPaidOrder(order: AnalyticsOrder, session: {
  id: string; livemode: boolean; payment_status: string
  amount_total: number | null; currency: string | null
}) {
  return Boolean(order.user_id && order.stripe_session_id === session.id
    && session.livemode && session.payment_status === 'paid'
    && Number.isSafeInteger(order.amount) && order.amount > 0
    && session.amount_total === order.amount
    && session.currency?.toLowerCase() === order.currency.toLowerCase()
    && Number.isFinite(Date.parse(order.paid_at)))
}
