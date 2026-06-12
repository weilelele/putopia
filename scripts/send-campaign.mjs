#!/usr/bin/env node
/**
 * High-activity user co-creation campaign sender (Resend).
 *
 * Two emails, both reply-driven (no links):
 *   - Email 1 "The Inner Circle"  -> behavior groups A / B / C
 *   - Email 2 "The Explorers"     -> behavior group D
 *
 * Reads recipients from top30_active_users.csv, injects display_name,
 * renders the VI-compliant HTML template, and sends via the Resend REST API.
 *
 * SAFE BY DEFAULT: dry-run. It only prints what it WOULD send.
 *   node scripts/send-campaign.mjs            # dry-run, all groups
 *   node scripts/send-campaign.mjs --group=1  # dry-run, Inner Circle only
 *   node scripts/send-campaign.mjs --only=you@example.com  # dry-run, one address (test)
 *   node scripts/send-campaign.mjs --send     # ACTUALLY SEND
 *
 * Env (from .env.local): RESEND_API_KEY (required to --send), RESEND_FROM.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CSV = join(ROOT, 'top30_active_users.csv')
const RESEND_ENDPOINT = 'https://api.resend.com/emails'

// ---- tiny .env.local loader (no dependency) -------------------------------
function loadEnv() {
  try {
    for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* no .env.local — rely on real env */ }
}
loadEnv()

const FROM = process.env.RESEND_FROM || 'Multiverse Collective <architect@multiverseco.org>'
const API_KEY = process.env.RESEND_API_KEY

// ---- Supabase outreach_log (dedupe + audit) -------------------------------
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CAMPAIGN_DEFAULT = `high_activity_${new Date().toISOString().slice(0, 7).replace('-', '_')}`

// Every email we've EVER sent, across all campaigns — used to never double-contact.
async function getContactedEmails() {
  if (!SUPA_URL || !SUPA_KEY) { console.warn('  ⚠️  Supabase env missing — dedupe OFF'); return null }
  const res = await fetch(`${SUPA_URL}/rest/v1/outreach_log?select=email`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
  })
  if (!res.ok) { console.warn(`  ⚠️  outreach_log read failed (${res.status}) — dedupe OFF`); return null }
  return new Set((await res.json()).map(r => (r.email || '').trim().toLowerCase()))
}

async function recordSend(row) {
  if (!SUPA_URL || !SUPA_KEY) return
  const res = await fetch(`${SUPA_URL}/rest/v1/outreach_log`, {
    method: 'POST',
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify(row),
  }).catch(e => ({ ok: false, status: e.message }))
  if (!res.ok) console.warn(`  ⚠️  outreach_log insert failed for ${row.email} (${res.status})`)
}

// ---- robust-enough CSV parser (handles quoted fields w/ commas) -----------
function parseCSV(text) {
  const rows = []
  let row = [], field = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') q = false
      else field += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      if (field !== '' || row.length) { row.push(field); rows.push(row); row = []; field = '' }
    } else field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  const header = rows.shift()
  return rows.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
}

// ---- VI-compliant HTML shell ----------------------------------------------
const FONT = "'Courier Prime','Courier New',Courier,monospace"
function shell(headline, bodyHtml) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet"></head>
<body style="margin:0;background:#0A0E27;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0E27;border-collapse:collapse;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#13182E;border:1px solid #2a2f4a;border-radius:2px;border-collapse:separate;">
<tr><td style="padding:28px 32px 8px;border-bottom:1px solid #2a2f4a;">
<div style="font-family:${FONT};font-weight:700;font-size:15px;letter-spacing:3px;color:#FF6B35;text-transform:uppercase;">&#9670; Multiverse&nbsp;Collective</div></td></tr>
<tr><td style="padding:32px 32px 8px;font-family:${FONT};color:#F5F5F5;font-size:15px;line-height:1.7;">
<div style="font-size:20px;font-weight:700;color:#F5F5F5;letter-spacing:.5px;margin:0 0 20px;">${headline}</div>
${bodyHtml}</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #2a2f4a;font-family:${FONT};color:#5a6080;font-size:11px;line-height:1.6;">
Sent by Multiverse Collective &middot; architect@multiverseco.org<br>
You're receiving this as a registered Voyager. <a href="mailto:architect@multiverseco.org?subject=Unsubscribe" style="color:#7a82a8;text-decoration:underline;">Unsubscribe</a>
</td></tr></table></td></tr></table></body></html>`
}
const p = (html) => `<p style="margin:0 0 16px;">${html}</p>`
const orange = (t) => `<span style="color:#FF8C5A;font-weight:700;">${t}</span>`

// ---- the two emails --------------------------------------------------------
function email1(name) {
  const headline = "You're one of the few we're building the next layer with"
  const body =
    p(`Hey ${name},`) +
    p(`Out of everyone who's joined the Multiverse Collective, only a small handful do more than look around &mdash; they leave a comment, they cast a vote, they actually shape where this goes. ${orange("You're one of them.")}`) +
    p(`So we want you closer to the center. We're opening a small co-creation circle: early looks at new worlds and devices, a direct line to the architects, and a real say in what we build next. The people who've already put something into this place are exactly the ones we want deciding what comes after.`) +
    p(`We'd like you in it. Just reply to this email with ${orange('&ldquo;I\'m in&rdquo;')} &mdash; we'll send you the first brief this week.`) +
    `<p style="margin:24px 0 0;">&mdash; The Architects, Multiverse Collective</p>`
  const text =
`Hey ${name},

Out of everyone who's joined the Multiverse Collective, only a small handful do more than look around — they leave a comment, they cast a vote, they actually shape where this goes. You're one of them.

So we want you closer to the center. We're opening a small co-creation circle: early looks at new worlds and devices, a direct line to the architects, and a real say in what we build next. The people who've already put something into this place are exactly the ones we want deciding what comes after.

We'd like you in it. Just reply to this email with "I'm in" — we'll send you the first brief this week.

— The Architects, Multiverse Collective`
  return { subject: "You're one of the few we're building the next layer with", html: shell(headline, body), text }
}

function email2(name) {
  const headline = "You've been exploring &mdash; what's caught your eye?"
  const body =
    p(`Hey ${name},`) +
    p(`You've spent real time wandering the Multiverse Collective &mdash; more than most. Which means you've already got a sense of this place, even if you've kept it to yourself.`) +
    p(`So we'll ask you straight, and we mean it: ${orange('what do you actually think?')} What pulled you in, what's missing, what would you build if it were yours? There's a real person on the other end of this email &mdash; the best things we've shipped started exactly like this, with someone hitting reply.`) +
    p(`One line or ten, we read every one. Just reply to this message.`) +
    `<p style="margin:24px 0 0;">&mdash; The Architects, Multiverse Collective</p>`
  const text =
`Hey ${name},

You've spent real time wandering the Multiverse Collective — more than most. Which means you've already got a sense of this place, even if you've kept it to yourself.

So we'll ask you straight, and we mean it: what do you actually think? What pulled you in, what's missing, what would you build if it were yours? There's a real person on the other end of this email — the best things we've shipped started exactly like this, with someone hitting reply.

One line or ten, we read every one. Just reply to this message.

— The Architects, Multiverse Collective`
  return { subject: "You've been exploring — what's caught your eye?", html: shell(headline, body), text }
}

// ---- send ------------------------------------------------------------------
async function sendOne(to, { subject, html, text }) {
  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
  })
  if (!res.ok) return { ok: false, detail: `${res.status} ${await res.text().catch(() => '')}` }
  const data = await res.json().catch(() => ({}))
  return { ok: true, id: data.id }
}

// ---- main ------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2)
  const SEND = args.includes('--send')
  const groupArg = (args.find(a => a.startsWith('--group=')) || '').split('=')[1]
  const onlyArg = (args.find(a => a.startsWith('--only=')) || '').split('=')[1]
  const toArg = (args.find(a => a.startsWith('--to=')) || '').split('=')[1]   // ad-hoc test address (not in CSV)
  const nameArg = (args.find(a => a.startsWith('--name=')) || '').split('=')[1]

  // --to=<email>: send one ad-hoc test (default Email 1; --group=2 for Email 2)
  if (toArg) {
    const groupNum = groupArg === '2' ? 2 : 1
    const r = { email: toArg, name: nameArg || 'Voyager', groupNum, rank: 'TEST', seg: 'TEST' }
    console.log(`\n${SEND ? '🚀 LIVE SEND' : '🧪 DRY-RUN'} — TEST to ${toArg} (Email ${groupNum}) from: ${FROM}`)
    if (SEND && !API_KEY) { console.error('\n❌ RESEND_API_KEY not set. Aborting.'); process.exit(1) }
    const built = (groupNum === 1 ? email1 : email2)(r.name)
    if (!SEND) { console.log(`  Subject: ${built.subject}\n${built.text}`); return }
    const out = await sendOne(r.email, built)
    console.log(out.ok ? `  ✓ sent id=${out.id}` : `  ✗ FAILED: ${out.detail}`)
    return
  }

  const rows = parseCSV(readFileSync(CSV, 'utf8'))
  const recipients = rows.map(r => {
    const g = (r.behavior_group || '').trim().charAt(0).toUpperCase()
    const groupNum = g === 'D' ? 2 : 1
    const name = (r.display_name || '').trim() || 'Voyager'
    return { email: (r.email || '').trim(), name, groupNum, rank: r.rank, seg: r.behavior_group }
  }).filter(r => r.email)
    .filter(r => !groupArg || String(r.groupNum) === String(groupArg))
    .filter(r => !onlyArg || r.email.toLowerCase() === onlyArg.toLowerCase())

  const CAMPAIGN = (args.find(a => a.startsWith('--campaign=')) || `--campaign=${CAMPAIGN_DEFAULT}`).split('=')[1]
  const noDedup = args.includes('--no-dedup')

  // DEDUPE: drop anyone we've ever emailed before (any past campaign)
  const contacted = noDedup ? null : await getContactedEmails()
  const fresh = contacted ? recipients.filter(r => !contacted.has(r.email.toLowerCase())) : recipients
  const skipped = recipients.length - fresh.length

  console.log(`\n${SEND ? '🚀 LIVE SEND' : '🧪 DRY-RUN (no emails sent)'} — campaign="${CAMPAIGN}" — from: ${FROM}`)
  console.log(`Recipients: ${fresh.length}  (Inner Circle: ${fresh.filter(r=>r.groupNum===1).length}, Explorers: ${fresh.filter(r=>r.groupNum===2).length})` +
    (skipped ? `  · ${skipped} skipped (already contacted)` : '') + (noDedup ? '  · dedupe OFF' : ''))
  if (SEND && !API_KEY) { console.error('\n❌ RESEND_API_KEY not set — cannot --send. Aborting.'); process.exit(1) }

  let sent = 0, failed = 0
  for (const r of fresh) {
    const variant = r.groupNum === 1 ? 'inner_circle' : 'explorers'
    const built = (r.groupNum === 1 ? email1 : email2)(r.name)
    if (!SEND) {
      console.log(`\n— [#${r.rank} ${r.seg}] ${r.email}  (${r.name})`)
      console.log(`  Subject: ${built.subject}`)
      console.log('  ' + built.text.split('\n').slice(0, 3).join('\n  ') + ' …')
      continue
    }
    const out = await sendOne(r.email, built)
    if (out.ok) {
      sent++; console.log(`  ✓ ${r.email}  id=${out.id}`)
      await recordSend({ email: r.email, campaign: CAMPAIGN, email_variant: variant, behavior_group: r.seg, rank: Number(r.rank) || null, resend_id: out.id })
    } else { failed++; console.error(`  ✗ ${r.email}  ${out.detail}`) }
    await new Promise(res => setTimeout(res, 600)) // be gentle with rate limits
  }
  if (SEND) console.log(`\nDone. sent=${sent} failed=${failed}  · logged to outreach_log (campaign="${CAMPAIGN}")`)
  else console.log(`\nDry-run complete (${skipped} would be skipped as already-contacted). Re-run with --send to actually send.`)
}

main().catch(e => { console.error(e); process.exit(1) })
