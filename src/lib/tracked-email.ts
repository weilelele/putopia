import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

type TrackedEmailInput = {
  eventKey: string
  userId?: string | null
  recipient: string
  category: string
  batchSlug?: string | null
  orderId?: string | null
  subject: string
  html: string
  text: string
  replyTo?: string
}

export type TrackedEmailResult = {
  error: string | null
  sent: boolean
  skipped: boolean
}

type DeliveryRow = {
  id: string
  status: 'pending' | 'sent' | 'failed'
  attempt_count: number
  updated_at: string
}

const PENDING_LEASE_MS = 5 * 60 * 1000

export async function sendTrackedEmail(
  input: TrackedEmailInput,
): Promise<TrackedEmailResult> {
  const admin = createAdminClient()
  const eventKey = input.eventKey.slice(0, 256)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingData, error: selectError } = await (admin.from('email_delivery_log') as any)
    .select('id, status, attempt_count, updated_at')
    .eq('event_key', eventKey)
    .maybeSingle()

  if (selectError) return { error: selectError.message, sent: false, skipped: false }

  const existing = existingData as DeliveryRow | null
  if (existing?.status === 'sent') {
    return { error: null, sent: false, skipped: true }
  }
  if (
    existing?.status === 'pending'
    && Date.now() - new Date(existing.updated_at).getTime() < PENDING_LEASE_MS
  ) {
    return { error: null, sent: false, skipped: true }
  }

  let rowId = existing?.id
  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin.from('email_delivery_log') as any)
      .update({
        status: 'pending',
        error: null,
        attempt_count: existing.attempt_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (error) return { error: error.message, sent: false, skipped: false }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin.from('email_delivery_log') as any)
      .insert({
        event_key: eventKey,
        user_id: input.userId ?? null,
        recipient: input.recipient.toLowerCase(),
        category: input.category,
        batch_slug: input.batchSlug ?? null,
        order_id: input.orderId ?? null,
      })
      .select('id')
      .single()
    if (error?.code === '23505') {
      return { error: null, sent: false, skipped: true }
    }
    if (error || !data?.id) {
      return { error: error?.message ?? 'Could not reserve email delivery', sent: false, skipped: false }
    }
    rowId = data.id as string
  }

  const sent = await sendEmail({
    to: input.recipient,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
    idempotencyKey: eventKey,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: logError } = await (admin.from('email_delivery_log') as any)
    .update(
      sent.error
        ? {
            status: 'failed',
            error: sent.error,
            updated_at: new Date().toISOString(),
          }
        : {
            status: 'sent',
            error: null,
            resend_id: sent.id ?? null,
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
    )
    .eq('id', rowId)

  return {
    error: sent.error ?? logError?.message ?? null,
    sent: !sent.error,
    skipped: false,
  }
}
