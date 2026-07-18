/**
 * One-off recovery send: magic links to active users who clicked an invite,
 * posted content via that session, but never completed /register
 * (registered_at = NULL → no password). The link routes them to /register so
 * they can set credentials. Internal @putopia.internal seed accounts are
 * excluded. Throttled to stay under Resend's rate limit.
 *
 * Run:  node scripts/send-register-recovery.mjs --env-file .env.local
 *       node scripts/send-register-recovery.mjs --env-file .env.local --dry
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const DRY = process.argv.includes('--dry')
const SITE_URL = 'https://www.multiverseco.org'
const FROM = 'Multiverse Collective <noreply@multiverseco.org>'
const THROTTLE_MS = 700

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

function buildHtml(actionLink) {
  return `
    <div style="font-family:Courier New,monospace;background:#0A0E27;color:#F5F5F5;padding:28px;line-height:1.6">
      <div style="color:#FF6B35;letter-spacing:.18em;font-size:12px;margin-bottom:12px">MULTIVERSE COLLECTIVE</div>
      <h1 style="font-size:20px;margin:0 0 12px;color:#F5F5F5">Finish setting up your access.</h1>
      <p style="color:rgba(245,245,245,.72);font-size:14px;margin:0 0 20px">
        You started exploring the Collective but never set an access code, so you
        can't log back in once your session ends. Use the secure link below to
        finish registration — it takes a moment.
      </p>
      <a href="${actionLink}" style="display:inline-block;background:#FF6B35;color:#070912;text-decoration:none;font-weight:bold;padding:12px 18px;letter-spacing:.08em">
        COMPLETE REGISTRATION
      </a>
      <p style="color:rgba(245,245,245,.45);font-size:12px;margin:22px 0 0">
        If the button does not work, paste this URL into your browser:<br>
        <span style="word-break:break-all">${actionLink}</span>
      </p>
    </div>
  `
}

async function sendResend(to, subject, html, text) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    return { error: `Resend ${res.status}: ${detail.slice(0, 120)}` }
  }
  return { error: null }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const ids = JSON.parse(readFileSync('/tmp/active_nonreg.json', 'utf8'))

  // Resolve auth users
  let all = []
  for (let page = 1; ; page++) {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000, page })
    if (!data?.users?.length) break
    all.push(...data.users)
    if (data.users.length < 1000) break
  }
  const byId = new Map(all.map((u) => [u.id, u]))

  // Build target list: real emails, exclude internal seeds, re-verify registered_at is NULL
  const targets = []
  for (const id of ids) {
    const u = byId.get(id)
    if (!u?.email) continue
    if (u.email.endsWith('@putopia.internal')) continue
    const { data: p } = await admin
      .from('voyager_profiles')
      .select('registered_at')
      .eq('id', id)
      .maybeSingle()
    if (p?.registered_at) continue // already registered, skip
    targets.push(u.email.toLowerCase())
  }

  console.log(`Targets: ${targets.length}${DRY ? ' (DRY RUN — no sends)' : ''}`)

  const results = []
  for (const email of targets) {
    if (DRY) { console.log('  would send →', email); continue }

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${SITE_URL}/auth/callback?next=/register` },
    })
    if (error) { console.log('  ✗', email, '— generateLink:', error.message); results.push({ email, ok: false }); continue }

    const tokenHash = data.properties?.hashed_token
    const link = tokenHash
      ? `${SITE_URL}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=${encodeURIComponent('/register')}`
      : data.properties?.action_link
    if (!link) { console.log('  ✗', email, '— no link'); results.push({ email, ok: false }); continue }

    const send = await sendResend(
      email,
      'Finish your Multiverse Collective registration',
      buildHtml(link),
      ['Finish setting up your access to the Multiverse Collective.', '', link, '', 'If you did not request this, you can ignore this message.'].join('\n'),
    )
    if (send.error) { console.log('  ✗', email, '—', send.error); results.push({ email, ok: false }) }
    else { console.log('  ✓', email); results.push({ email, ok: true }) }

    await sleep(THROTTLE_MS)
  }

  const ok = results.filter((r) => r.ok).length
  console.log(`\nDone. Sent ${ok}/${results.length}.`)
}

main().catch((e) => { console.error('FATAL', e.message); process.exit(1) })
