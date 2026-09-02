/**
 * "Your world really exists" email — sent once when a world's FIRST Signal
 * Tuning day is published. The subject + body copy is generated per-world by
 * Claude (claude-opus-4-8) from the world's name + description; the shell
 * (logo, collective-decision line, Day 1 option grid, button) is fixed.
 *
 * Resilience:
 *  - Email source is auth.users (voyager_profiles.email is often null) with a
 *    profile fallback.
 *  - If Claude is unavailable or out of credit, we fall back to fixed copy AND
 *    alert the Architect so they can top up — the proposer still gets a clean
 *    email, just with generic wording.
 *  - Idempotent via worlds.confirm_email_sent_at.
 */
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { sendPushToUser } from '@/lib/push/apns'
import { SCAN_NOTIFICATIONS_ENABLED } from './scan-notification-policy'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://multiverseco.org'
const ICON = `${SITE}/assets/vi-icon.png`
const WORDMARK = `${SITE}/assets/vi-wordmark.png`
const ALERT_TO = process.env.ALERT_EMAIL ?? 'misteror.ywl@gmail.com'

// Fixed collective-decision line shown above the Day 1 options.
const DECIDE =
  'Signals from several competing worlds have reached us at once. We urgently need you to help decide, together &mdash; which one truly defines the world you foresaw?'

interface WorldCopy {
  subject: string
  lead: string // 1 sentence: confirms the world entered Signal Tuning
  evoke: string // 1–2 sentences evoking the world's specific imagery
}

/** Resolve a user's email: auth.users is authoritative (profile email is often
 *  null on older rows), with a voyager_profiles fallback. */
export async function resolveUserEmail(admin: DB, userId: string): Promise<string | null> {
  try {
    const { data } = await admin.auth.admin.getUserById(userId)
    if (data?.user?.email) return data.user.email as string
  } catch { /* fall through to profile */ }
  const { data: profile } = await admin
    .from('voyager_profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle()
  return (profile as { email: string | null } | null)?.email ?? null
}

const STATIC_COPY = (worldName: string): WorldCopy => ({
  subject: `${worldName} really exists — the first signal is live`,
  lead: `An Architect has confirmed your sighting. ${worldName} has entered Signal Tuning.`,
  evoke:
    'We now recognise this world truly exists, and our instruments are locked onto the multiverse, scanning for the signals that carry its trace.',
})

/**
 * Generate per-world subject + body copy with Claude. Returns null on any
 * failure (missing key, out of credit, rate limit, overload) — callers fall
 * back to STATIC_COPY and alert. The `reason` is surfaced for the alert.
 */
async function generateWorldCopy(
  worldName: string,
  description: string,
): Promise<{ copy: WorldCopy | null; reason?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { copy: null, reason: 'ANTHROPIC_API_KEY not set' }

  const client = new Anthropic({ apiKey })

  const system = [
    'You are the copywriter for the Multiverse Collective, a fiction-flavoured community where members "discover" parallel worlds.',
    'Voice: a deep-space mission-control terminal — second person, present tense, understated awe, plain English. No emojis, no exclamation marks, no markdown.',
    'You write the copy for the email a member receives when an Architect confirms the world they proposed and moves it into "Signal Tuning".',
    'Return three fields:',
    '- subject: an email subject under 60 characters, referencing the world; ends with the idea that it is real / its signal is live.',
    '- lead: ONE sentence confirming an Architect has selected the world and it has entered Signal Tuning. Name the world.',
    '- evoke: ONE to TWO sentences that evoke the SPECIFIC imagery of THIS world (drawn only from its name and description) and say we are now scanning the multiverse for its signals.',
    'Ground every detail in the provided name and description. Never invent facts that are not implied by them.',
  ].join('\n')

  const user = `World name: ${worldName}\n\nWorld description:\n${description || '(no description provided)'}`

  try {
    const res = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 600,
      system,
      messages: [{ role: 'user', content: user }],
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              subject: { type: 'string' },
              lead: { type: 'string' },
              evoke: { type: 'string' },
            },
            required: ['subject', 'lead', 'evoke'],
            additionalProperties: false,
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    if (res.stop_reason === 'refusal') return { copy: null, reason: 'model refused' }
    const text = res.content.find((b) => b.type === 'text')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (text as any)?.text
    if (!raw) return { copy: null, reason: 'empty response' }
    const parsed = JSON.parse(raw) as WorldCopy
    if (!parsed.subject || !parsed.lead || !parsed.evoke) return { copy: null, reason: 'incomplete fields' }
    return { copy: parsed }
  } catch (e) {
    // Surfaces credit-exhaustion (400/billing), rate limit (429), overload (529),
    // auth (401), etc. — all mean "AI copy unavailable right now".
    const status = (e as { status?: number })?.status
    const type = (e as { type?: string })?.type
    const msg = e instanceof Error ? e.message : 'unknown error'
    return { copy: null, reason: `${status ?? '?'} ${type ?? ''} ${msg}`.trim() }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildHtml(worldId: string, worldName: string, copy: WorldCopy, optionUrls: string[]): string {
  // Highlight the world name in the lead, if present verbatim.
  const safeName = escapeHtml(worldName)
  const lead = escapeHtml(copy.lead).replace(
    safeName,
    `<span style="color:#FF6B35;">${safeName}</span>`,
  )
  const evoke = escapeHtml(copy.evoke)
  const cells = optionUrls
    .slice(0, 4)
    .map(
      (u) =>
        `<td width="25%" style="padding:0 3px;"><img src="${u}" width="100%" style="display:block;width:100%;border:1px solid #1E2840;" alt=""/></td>`,
    )
    .join('')
  const optionsBlock = optionUrls.length
    ? `<p style="margin:0 0 10px 0;font-size:9px;letter-spacing:0.25em;color:#4A5570;text-transform:uppercase;">// Day 1 &mdash; which signal is yours?</p>
       <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;"><tr>${cells}</tr></table>`
    : ''
  const cta = optionUrls.length ? '[ CAST YOUR SIGNAL ]' : '[ ENTER YOUR WORLD ]'

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#0A0E27;font-family:'Courier New',Courier,monospace;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0A0E27;"><tr><td align="center" style="padding:48px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
<tr><td align="center" style="padding-bottom:36px;"><table cellpadding="0" cellspacing="0" border="0"><tr>
  <td valign="middle"><img src="${ICON}" height="38" style="display:block;height:38px;width:auto;" alt=""/></td><td width="10"></td>
  <td valign="middle"><img src="${WORDMARK}" height="30" style="display:block;height:30px;width:auto;" alt="Multiverse Collective"/></td>
</tr></table></td></tr>
<tr><td style="background-color:#0D1020;border:1px solid #1E2840;padding:40px 36px;">
  <p style="margin:0 0 22px 0;font-size:9px;letter-spacing:0.3em;color:#4A5570;text-transform:uppercase;">// World confirmed</p>
  <h1 style="margin:0 0 18px 0;font-size:22px;font-weight:700;letter-spacing:0.08em;color:#F5F5F5;line-height:1.3;">YOUR WORLD<br/>REALLY EXISTS</h1>
  <p style="margin:0 0 18px 0;font-size:12px;line-height:1.9;color:#8A9AB5;">${lead}</p>
  <p style="margin:0 0 18px 0;font-size:12px;line-height:1.9;color:#8A9AB5;">${evoke}</p>
  <p style="margin:0 0 26px 0;font-size:12px;line-height:1.9;color:#C7D2E6;">${DECIDE}</p>
  ${optionsBlock}
  <table cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:#FF6B35;">
    <a href="${SITE}/worlds/${worldId}" style="display:inline-block;padding:14px 32px;font-size:11px;font-weight:700;letter-spacing:0.2em;color:#0A0E27;text-decoration:none;text-transform:uppercase;">${cta}</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding-top:24px;"><p style="margin:0;font-size:9px;color:#2A3A5A;text-align:center;line-height:1.8;letter-spacing:0.05em;">BUILDING BETTER WORLDS, TOGETHER.<br/><a href="${SITE}" style="color:#4A5570;text-decoration:none;">multiverseco.org</a></p></td></tr>
</table></td></tr></table></body></html>`
}

/** First published day's selected option image URLs (≤4), for the email grid. */
async function firstDayOptionUrls(admin: DB, worldId: string): Promise<string[]> {
  const { data: thread } = await admin.from('signal_threads').select('id').eq('world_id', worldId).maybeSingle()
  if (!thread?.id) return []
  const { data: tasks } = await admin
    .from('signal_tasks')
    .select('id')
    .eq('thread_id', thread.id)
    .eq('is_published', true)
    .order('day_index', { ascending: true })
    .limit(1)
  const taskId = (tasks ?? [])[0]?.id
  if (!taskId) return []
  const { data: opts } = await admin
    .from('signal_task_assets')
    .select('processed_url, display_url')
    .eq('task_id', taskId)
    .eq('is_selected', true)
    .eq('asset_role', 'option')
  return ((opts ?? []) as { processed_url: string | null; display_url: string | null }[])
    .map((o) => o.processed_url || o.display_url)
    .filter((u): u is string => !!u)
    .slice(0, 4)
}

/**
 * Send the "your world really exists" email to the world's proposer, once.
 * Best-effort and idempotent — safe to call on every day publish.
 */
export async function maybeSendWorldConfirmedEmail(worldId: string): Promise<void> {
  // Also covers legacy worlds notified directly when a Signal day is published.
  if (!SCAN_NOTIFICATIONS_ENABLED) return

  const admin = createAdminClient() as DB

  const { data: world } = await admin
    .from('worlds')
    .select('id, name, description, submitted_by, discoverer_id, confirm_email_sent_at')
    .eq('id', worldId)
    .maybeSingle()
  if (!world || world.confirm_email_sent_at) return // unknown or already sent

  const ownerId: string | null = world.submitted_by || world.discoverer_id
  if (!ownerId) return

  // Claim the slot first so concurrent publishes can't double-send.
  const { error: claimErr } = await admin
    .from('worlds')
    .update({ confirm_email_sent_at: new Date().toISOString() })
    .eq('id', worldId)
    .is('confirm_email_sent_at', null)
  if (claimErr) return

  const worldName: string = world.name ?? 'your world'
  const push = await sendPushToUser(ownerId, {
    eventType: 'world_confirmed',
    title: 'YOUR WORLD IS REAL',
    body: `${worldName} has entered Signal Tuning. Its first signals are ready.`,
    route: `/worlds/${worldId}`,
    collapseId: `world-confirmed-${worldId}`,
  })
  if (push.delivered > 0) return

  const to = await resolveUserEmail(admin, ownerId)
  if (!to) return
  const { copy, reason } = await generateWorldCopy(worldName, world.description ?? '')
  const finalCopy = copy ?? STATIC_COPY(worldName)

  if (!copy) {
    // AI copy unavailable — alert the Architect so they can top up credits.
    await sendEmail({
      to: ALERT_TO,
      subject: '⚠️ Signal Dispatch: AI email copy unavailable',
      html: `<p>The world-confirmed email for <strong>${escapeHtml(worldName)}</strong> (${worldId}) was sent with <strong>fallback copy</strong> because Claude copy generation failed.</p>
             <p>Reason: <code>${escapeHtml(reason ?? 'unknown')}</code></p>
             <p>If this is a credit / billing issue, top up at <a href="https://console.anthropic.com/settings/billing">console.anthropic.com</a>. New worlds will keep using fallback copy until it's resolved.</p>`,
    })
  }

  const optionUrls = await firstDayOptionUrls(admin, worldId)
  const html = buildHtml(worldId, worldName, finalCopy, optionUrls)
  await sendEmail({ to, subject: finalCopy.subject, html })
}
