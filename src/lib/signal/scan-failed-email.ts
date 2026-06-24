/**
 * "The scan came back empty" email — sent once when a world's Signal Scanning
 * window closes with NO signal tuned (no published day). Static copy in the
 * deep-space mission-control voice, inviting the proposer to add more field
 * notes and re-scan. Idempotency is owned by the caller (scan-resolve, via
 * worlds.scan_resolved_at), so this is a plain best-effort send.
 */
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { resolveUserEmail } from './world-confirmed-email'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://multiverseco.org'
const ICON = `${SITE}/assets/vi-icon.png`
const WORDMARK = `${SITE}/assets/vi-wordmark.png`

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildHtml(worldId: string, worldName: string): string {
  const safeName = escapeHtml(worldName)
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#0A0E27;font-family:'Courier New',Courier,monospace;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0A0E27;"><tr><td align="center" style="padding:48px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
<tr><td align="center" style="padding-bottom:36px;"><table cellpadding="0" cellspacing="0" border="0"><tr>
  <td valign="middle"><img src="${ICON}" height="38" style="display:block;height:38px;width:auto;" alt=""/></td><td width="10"></td>
  <td valign="middle"><img src="${WORDMARK}" height="30" style="display:block;height:30px;width:auto;" alt="Multiverse Collective"/></td>
</tr></table></td></tr>
<tr><td style="background-color:#0D1020;border:1px solid #1E2840;padding:40px 36px;">
  <p style="margin:0 0 22px 0;font-size:9px;letter-spacing:0.3em;color:#4A5570;text-transform:uppercase;">// Scan complete &mdash; no reading</p>
  <h1 style="margin:0 0 18px 0;font-size:22px;font-weight:700;letter-spacing:0.08em;color:#F5F5F5;line-height:1.3;">THE SCAN CAME<br/>BACK EMPTY</h1>
  <p style="margin:0 0 18px 0;font-size:12px;line-height:1.9;color:#8A9AB5;">We swept the multiverse for the signals of <span style="color:#FF6B35;">${safeName}</span>, but the trace was too faint to lock onto.</p>
  <p style="margin:0 0 26px 0;font-size:12px;line-height:1.9;color:#C7D2E6;">The notes you filed were limited, so we couldn&rsquo;t aim the instruments precisely. Tell us more about the world you foresaw &mdash; the smallest detail can be the difference &mdash; and we&rsquo;ll run the scan again.</p>
  <table cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:#FF6B35;">
    <a href="${SITE}/worlds/${worldId}" style="display:inline-block;padding:14px 32px;font-size:11px;font-weight:700;letter-spacing:0.2em;color:#0A0E27;text-decoration:none;text-transform:uppercase;">[ ADD MORE &amp; RE-SCAN ]</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding-top:24px;"><p style="margin:0;font-size:9px;color:#2A3A5A;text-align:center;line-height:1.8;letter-spacing:0.05em;">BUILDING BETTER WORLDS, TOGETHER.<br/><a href="${SITE}" style="color:#4A5570;text-decoration:none;">multiverseco.org</a></p></td></tr>
</table></td></tr></table></body></html>`
}

/** Email the proposer that their scan returned no signal. Best-effort. */
export async function sendScanFailedEmail(worldId: string): Promise<void> {
  const admin = createAdminClient() as DB

  const { data: world } = await admin
    .from('worlds')
    .select('id, name, submitted_by, discoverer_id')
    .eq('id', worldId)
    .maybeSingle()
  if (!world) return

  const ownerId: string | null = world.submitted_by || world.discoverer_id
  if (!ownerId) return
  const to = await resolveUserEmail(admin, ownerId)
  if (!to) return

  const worldName: string = world.name ?? 'your world'
  const html = buildHtml(worldId, worldName)
  await sendEmail({ to, subject: `${worldName}: the scan came back empty — tell us more`, html })
}
