import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { verifySvixSignature, parseEmailAddress, extractReplyToken } from '@/lib/resend-webhook'

export const dynamic = 'force-dynamic'

// POST /api/webhooks/resend-inbound
// Resend Inbound posts an `email.received` event when someone replies to a
// campaign email (routed via the inbound subdomain). We match the reply back to
// an outreach_log row, roll up replied_at/reply_count, store an audit row, and
// ping the human inbox. See docs/reply-tracking-setup.md for the wiring.
export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_INBOUND_SIGNING_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'inbound webhook not configured' }, { status: 503 })
  }

  const raw = await req.text()
  const headers = {
    id: req.headers.get('svix-id') ?? '',
    timestamp: req.headers.get('svix-timestamp') ?? '',
    signature: req.headers.get('svix-signature') ?? '',
  }
  if (!verifySvixSignature(raw, headers, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  let event: { type?: string; data?: Record<string, unknown> }
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  if (event.type !== 'email.received') {
    return NextResponse.json({ received: true, ignored: event.type ?? null })
  }

  const data = event.data ?? {}
  const fromEmail = parseEmailAddress(data.from as string)
  const toList = (Array.isArray(data.to) ? data.to : [data.to]) as Array<string | null>
  const token = extractReplyToken(toList)
  const subject = (data.subject as string) ?? null
  const messageId = (data.message_id as string) ?? null
  const resendEmailId = (data.email_id as string) ?? null

  const admin = createAdminClient()

  // Resolve the outreach_log row: by reply-token first (deterministic), then by
  // the replier's email address as a fallback.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logTable = () => admin.from('outreach_log') as any
  let row: { id: string; email: string; campaign: string; reply_count: number; replied_at: string | null } | null = null
  if (token) {
    const { data: r } = await logTable()
      .select('id,email,campaign,reply_count,replied_at')
      .eq('reply_token', token)
      .limit(1)
      .maybeSingle()
    row = r ?? null
  }
  if (!row && fromEmail) {
    const { data: r } = await logTable()
      .select('id,email,campaign,reply_count,replied_at')
      .ilike('email', fromEmail)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    row = r ?? null
  }

  // Store the reply (idempotent on message_id — webhooks may retry).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insErr } = await (admin.from('outreach_replies') as any).insert({
    outreach_id: row?.id ?? null,
    email: fromEmail ?? row?.email ?? 'unknown',
    campaign: row?.campaign ?? null,
    subject,
    message_id: messageId,
    resend_email_id: resendEmailId,
  })
  if (insErr) {
    // 23505 = unique violation on message_id => already processed; ack quietly.
    if (insErr.code === '23505') return NextResponse.json({ received: true, duplicate: true })
    console.error('[resend-inbound] reply insert failed', insErr)
  }

  // Roll up onto outreach_log: first reply stamps replied_at; count increments.
  if (row?.id && !insErr) {
    await logTable()
      .update({
        replied_at: row.replied_at ?? new Date().toISOString(),
        reply_count: (row.reply_count ?? 0) + 1,
      })
      .eq('id', row.id)
  }

  // Ping the human inbox so replies are never missed (best-effort).
  if (!insErr) {
    const notifyTo = process.env.OUTREACH_NOTIFY_TO || 'architect@multiverseco.org'
    const who = fromEmail ?? row?.email ?? 'a voyager'
    await sendEmail({
      to: notifyTo,
      subject: `📩 ${who} replied to the co-creation invite`,
      html: `<p style="font-family:monospace"><strong>${who}</strong> just replied${subject ? ` — “${subject}”` : ''}.</p><p style="font-family:monospace">Full message is in the Resend inbound logs. Reply directly to continue the thread.</p>`,
      text: `${who} just replied${subject ? ` — "${subject}"` : ''}. Full message is in the Resend inbound logs.`,
      ...(fromEmail ? { replyTo: fromEmail } : {}),
    }).catch(() => {})
  }

  return NextResponse.json({ received: true, matched: Boolean(row) })
}
