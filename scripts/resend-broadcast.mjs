#!/usr/bin/env node
/**
 * Resend Broadcasts (marketing) pipeline for the weekly newsletter.
 *
 * Unlike transactional sends (scripts/send-campaign.mjs / src/lib/email.ts),
 * Broadcasts go to a managed Audience and get Resend's automatic unsubscribe
 * handling + List-Unsubscribe header — the compliance pieces a newsletter needs.
 *
 * A/B groups get different HTML, so we keep TWO audiences (direct / task_gated)
 * and one broadcast each. Per-recipient first name is filled by Resend's merge
 * tag {{{FIRST_NAME|Voyager}}}, injected via the export route's ?codename param.
 *
 * SAFE BY DEFAULT: every command is dry-run unless you pass --send.
 *
 *   node scripts/resend-broadcast.mjs audiences            # create the 2 audiences (prints IDs for .env)
 *   node scripts/resend-broadcast.mjs sync                 # dry-run: who would be imported, per group
 *   node scripts/resend-broadcast.mjs sync --send          # import contacts into the audiences
 *   node scripts/resend-broadcast.mjs broadcast            # dry-run: what broadcasts would be created
 *   node scripts/resend-broadcast.mjs broadcast --send     # create broadcasts as DRAFTS (review in dashboard)
 *   node scripts/resend-broadcast.mjs broadcast --send --now   # create AND send immediately
 *
 * Env (.env.local):
 *   RESEND_API_KEY                 required
 *   RESEND_FROM                    optional (default architect@multiverseco.org)
 *   RESEND_AUDIENCE_DIRECT         set from `audiences` output
 *   RESEND_AUDIENCE_TASK_GATED     set from `audiences` output
 *   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   to read contacts
 *   EXPORT_BASE                    optional (default https://multiverseco.org)
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
function loadEnv() {
  try {
    for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* rely on real env */ }
}
loadEnv()

const RESEND = 'https://api.resend.com'
const KEY = process.env.RESEND_API_KEY
const FROM = process.env.RESEND_FROM || 'Multiverse Collective <architect@multiverseco.org>'
const EXPORT_BASE = process.env.EXPORT_BASE || 'https://multiverseco.org'
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FIRST_NAME_TAG = '{{{FIRST_NAME|Voyager}}}'   // Resend broadcast merge tag

// Issue dateline, matching the in-email masthead format (e.g. "JUN 18, 2026").
const ISSUE_DATE = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
const SUBJECT = `This week in the Multiverse Collective — ${ISSUE_DATE}`

const GROUPS = [
  { key: 'direct',     name: 'Applicants — Direct (A)',      env: 'RESEND_AUDIENCE_DIRECT',     dbValue: 'direct',     subject: SUBJECT },
  { key: 'task-gated', name: 'Applicants — Task-Gated (B)',  env: 'RESEND_AUDIENCE_TASK_GATED', dbValue: 'task_gated', subject: SUBJECT },
]

async function resend(path, method = 'GET', body) {
  const res = await fetch(`${RESEND}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

// ── contacts from Supabase: join auth.users (email) with voyager_profiles ──────
async function loadContacts() {
  if (!SUPA_URL || !SUPA_KEY) throw new Error('Supabase env missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')

  // 1) all auth users → id→email (admin API, paginated)
  const idToEmail = new Map()
  for (let page = 1; page < 200; page++) {
    const res = await fetch(`${SUPA_URL}/auth/v1/admin/users?page=${page}&per_page=1000`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    })
    if (!res.ok) throw new Error(`auth admin users failed: ${res.status} ${await res.text().catch(() => '')}`)
    const { users } = await res.json()
    if (!users?.length) break
    for (const u of users) if (u.email) idToEmail.set(u.id, u.email)
    if (users.length < 1000) break
  }

  // 2) registered profiles with a group
  const res = await fetch(
    `${SUPA_URL}/rest/v1/voyager_profiles?select=id,display_name,registered_at,experiment_group&registered_at=not.is.null`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } },
  )
  if (!res.ok) throw new Error(`voyager_profiles read failed: ${res.status}`)
  const profiles = await res.json()

  const byGroup = { direct: [], task_gated: [] }
  let noEmail = 0, noGroup = 0
  for (const p of profiles) {
    const email = idToEmail.get(p.id)
    if (!email) { noEmail++; continue }
    if (p.experiment_group !== 'direct' && p.experiment_group !== 'task_gated') { noGroup++; continue }
    const firstName = (p.display_name || '').trim().split(/\s+/)[0] || 'Voyager'
    byGroup[p.experiment_group].push({ email, firstName })
  }
  return { byGroup, stats: { profiles: profiles.length, noEmail, noGroup } }
}

// ── commands ───────────────────────────────────────────────────────────────────
async function cmdAudiences(send) {
  console.log(`\n${send ? '🚀 CREATE' : '🧪 DRY-RUN'} audiences\n`)
  for (const g of GROUPS) {
    if (process.env[g.env]) { console.log(`  ${g.key}: already set ${g.env}=${process.env[g.env]} — skip`); continue }
    if (!send) { console.log(`  would create audience "${g.name}" → set ${g.env}`); continue }
    const r = await resend('/audiences', 'POST', { name: g.name })
    if (r.ok) console.log(`  ✓ created "${g.name}"  →  add to .env.local:\n      ${g.env}=${r.data.id}`)
    else console.error(`  ✗ ${g.key} failed: ${r.status} ${JSON.stringify(r.data)}`)
  }
  if (!send) console.log('\nRe-run with --send to create them.')
}

async function cmdSync(send) {
  const { byGroup, stats } = await loadContacts()
  console.log(`\n${send ? '🚀 IMPORT' : '🧪 DRY-RUN'} — profiles=${stats.profiles}, skipped(no email)=${stats.noEmail}, skipped(no group)=${stats.noGroup}`)
  for (const g of GROUPS) {
    const list = byGroup[g.dbValue]
    const aud = process.env[g.env]
    console.log(`\n  [${g.key}] ${list.length} contacts → audience ${aud || '(MISSING ' + g.env + ')'}`)
    if (!send) { console.log('    ' + list.slice(0, 5).map(c => `${c.email} (${c.firstName})`).join('\n    ') + (list.length > 5 ? `\n    … +${list.length - 5} more` : '')); continue }
    if (!aud) { console.error(`    ✗ ${g.env} not set — run "audiences --send" first and add it to .env.local`); continue }
    let ok = 0, fail = 0
    for (const c of list) {
      const r = await resend(`/audiences/${aud}/contacts`, 'POST', { email: c.email, first_name: c.firstName, unsubscribed: false })
      if (r.ok || r.status === 409) ok++; else { fail++; console.error(`    ✗ ${c.email} ${r.status}`) }
      await new Promise(s => setTimeout(s, 120))
    }
    console.log(`    ✓ upserted ${ok}, failed ${fail}`)
  }
  if (!send) console.log('\nRe-run with --send to import.')
}

async function cmdBroadcast(send, now) {
  console.log(`\n${send ? '🚀 CREATE BROADCAST' : '🧪 DRY-RUN'}${now ? ' + SEND NOW' : ''} — from: ${FROM}\n`)
  for (const g of GROUPS) {
    const aud = process.env[g.env]
    const url = `${EXPORT_BASE}/api/newsletter-export?group=${g.key}&codename=${encodeURIComponent(FIRST_NAME_TAG)}`
    const htmlRes = await fetch(url)
    const html = await htmlRes.text()
    console.log(`  [${g.key}] audience=${aud || 'MISSING'}  html=${html.length}B  subject="${g.subject}"`)
    if (!htmlRes.ok || html.length < 2000) { console.error(`    ✗ export fetch looked wrong (${htmlRes.status}); check ${url}`); continue }
    if (!send) { console.log(`    would create broadcast → ${url}`); continue }
    if (!aud) { console.error(`    ✗ ${g.env} not set`); continue }
    const r = await resend('/broadcasts', 'POST', { audience_id: aud, from: FROM, subject: g.subject, html, name: `Weekly · ${g.key} · ${new Date().toISOString().slice(0, 10)}` })
    if (!r.ok) { console.error(`    ✗ create failed ${r.status} ${JSON.stringify(r.data)}`); continue }
    console.log(`    ✓ broadcast created id=${r.data.id} (DRAFT)`)
    if (now) {
      const s = await resend(`/broadcasts/${r.data.id}/send`, 'POST', {})
      console.log(s.ok ? `    ✓ sent` : `    ✗ send failed ${s.status} ${JSON.stringify(s.data)}`)
    }
  }
  if (!send) console.log('\nRe-run with --send to create drafts (review in dashboard), or --send --now to send.')
}

// ── main ─────────────────────────────────────────────────────────────────────
const [cmd] = process.argv.slice(2)
const send = process.argv.includes('--send')
const now = process.argv.includes('--now')
if (!KEY) { console.error('❌ RESEND_API_KEY not set'); process.exit(1) }

const run = { audiences: () => cmdAudiences(send), sync: () => cmdSync(send), broadcast: () => cmdBroadcast(send, now) }[cmd]
if (!run) { console.log('Usage: node scripts/resend-broadcast.mjs <audiences|sync|broadcast> [--send] [--now]'); process.exit(1) }
run().catch(e => { console.error(e); process.exit(1) })
