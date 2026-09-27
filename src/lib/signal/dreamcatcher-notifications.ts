import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { resolveUserEmail } from './world-confirmed-email'
import { buildDreamcatcherEmail } from './dreamcatcher-email'

/** Only publication queues this email. No recall, participant broadcast or backfill. */
export async function sendDreamcatcherNotifications() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const result = { sent: 0, failed: 0 }
  const deadline = Date.now() + 35_000
  for (let i = 0; i < 3 && Date.now() < deadline; i++) {
    const { data: notice, error } = await admin.rpc('claim_dreamcatcher_notification')
    if (error) throw new Error(error.message)
    if (!notice) break
    let failure: string | null = null
    let provider: string | null = null
    try {
      const to = await resolveUserEmail(admin, notice.initiatorId)
      if (!to) throw new Error('Original submitter has no deliverable email')
      if (Date.parse(notice.closesAt) <= Date.now()) throw new Error('Feedback window closed before delivery')
      const copy = buildDreamcatcherEmail({ ...notice, siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://multiverseco.org' })
      const sent = await sendEmail({
        to, ...copy, idempotencyKey: `dreamcatcher-ready/${notice.roundId}`, timeoutMs: 15_000,
      })
      failure = sent.error
      provider = sent.id ?? null
    } catch (cause) {
      failure = cause instanceof Error ? cause.message : 'Notification failed'
    }
    const { error: finishError } = await admin.rpc('finish_dreamcatcher_notification', {
      p_round: notice.roundId, p_lease: notice.leaseToken, p_provider: provider, p_error: failure,
    })
    if (finishError) throw new Error(finishError.message)
    if (failure) result.failed++
    else result.sent++
  }
  return result
}
