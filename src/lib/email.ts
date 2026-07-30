/**
 * Minimal transactional-email helper backed by Resend.
 *
 * We talk to the REST API directly via fetch instead of pulling in the SDK —
 * one less dependency to keep in lockstep with this project's Next.js build,
 * and the surface we need (send one email) is a single POST.
 *
 * Configure via env:
 *   RESEND_API_KEY  — required; without it sends are skipped (logged, not thrown)
 *   RESEND_FROM     — optional; defaults to the Multiverse Collective no-reply
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const DEFAULT_FROM = 'Multiverse Collective <noreply@multiverseco.org>'

type SendEmailInput = {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  idempotencyKey?: string
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<{ error: string | null; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Soft-fail: a missing key must never break the user action that triggered
    // the notification (e.g. posting a reply). Surface it in logs only.
    console.warn('[email] RESEND_API_KEY not set — skipping send to', input.to)
    return { error: 'RESEND_API_KEY not configured' }
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(input.idempotencyKey
          ? { 'Idempotency-Key': input.idempotencyKey.slice(0, 256) }
          : {}),
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? DEFAULT_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    })

    const payload = await res.json().catch(() => null) as
      | { id?: string; message?: string; name?: string }
      | null
    if (!res.ok) {
      const detail = payload?.message ?? payload?.name ?? ''
      console.error('[email] Resend send failed', res.status, detail)
      return { error: `Resend ${res.status}` }
    }
    return { error: null, id: payload?.id }
  } catch (e) {
    console.error('[email] Resend send threw', e)
    return { error: e instanceof Error ? e.message : 'send failed' }
  }
}
