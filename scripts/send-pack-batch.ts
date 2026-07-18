#!/usr/bin/env tsx
/**
 * One-off BACKFILL send of the Initial Voyager Pack confirmation email to the
 * customers who already purchased (reviewed list of 14, architects + mock test
 * order excluded — see PR #50 discussion).
 *
 *   npx tsx scripts/send-pack-batch.ts          # dry-run (prints, sends nothing)
 *   npx tsx scripts/send-pack-batch.ts --send   # actually send
 *
 * Run NEXT_PUBLIC_SITE_URL=https://www.multiverseco.org so links/image use the
 * canonical host (apex 308-redirects to www).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { buildVoyagerPackEmail } from '../src/lib/voyager-pack-email'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const FROM = process.env.RESEND_FROM || 'Multiverse Collective <architect@multiverseco.org>'
const REPLY_TO = process.env.COLLECTIVE_REPLY_TO || FROM.replace(/^.*<|>.*$/g, '')
const API_KEY = process.env.RESEND_API_KEY
if (!API_KEY) { console.error('RESEND_API_KEY missing'); process.exit(1) }

const SEND = process.argv.includes('--send')

// Reviewed recipient list — paid Stripe (cs_live_) orders, role=voyager.
const RECIPIENTS: { email: string; name: string }[] = [
  { email: 'andrewhildenbrand@gmail.com', name: 'abryonh' },
  { email: 'walden673@yahoo.com',         name: 'Baldor493' },
  { email: 'kwilliams9866@gmail.com',     name: 'Zoidmau5' },
  { email: 'dg.plum.mech@gmail.com',      name: 'Griffin' },
  { email: 'narcagent211@yahoo.com',      name: 'CipherOneUltra' },
  { email: 'keirazwalters@gmail.com',     name: 'Vizzika' },
  { email: 'downer@gmail.com',            name: 'Downer' },
  { email: 'spackerdave@gmail.com',       name: 'Spackerdave' },
  { email: 'quinstar@yahoo.com',          name: 'Quinstar' },
  { email: 'jonabaier@gmail.com',         name: 'Drifter' },
  { email: 'jcdrib@gmail.com',            name: 'Jy' },
  { email: 'bkerby11@gmail.com',          name: 'redd' },
  { email: 'jmlillich72@gmail.com',       name: 'RouxGarou' },
  { email: 'tyryt1@gmail.com',            name: 'Tyryt' },
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  console.log(`${SEND ? 'SENDING' : 'DRY-RUN'} — ${RECIPIENTS.length} recipients, from ${FROM}, reply-to ${REPLY_TO}`)
  const results: { email: string; ok: boolean; id?: string; error?: string }[] = []
  for (const r of RECIPIENTS) {
    if (!SEND) { console.log(`  would send → ${r.email} (${r.name})`); continue }
    const { subject, html, text } = buildVoyagerPackEmail({ name: r.name })
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM, to: r.email, subject, html, text, reply_to: REPLY_TO }),
      })
      const body = await res.json()
      if (!res.ok) { results.push({ email: r.email, ok: false, error: `${res.status} ${JSON.stringify(body)}` }); console.log(`  ✗ ${r.email} — ${res.status}`) }
      else { results.push({ email: r.email, ok: true, id: body.id }); console.log(`  ✓ ${r.email} — ${body.id}`) }
    } catch (e) {
      results.push({ email: r.email, ok: false, error: String(e) }); console.log(`  ✗ ${r.email} — ${e}`)
    }
    await sleep(700)
  }
  if (SEND) {
    const ok = results.filter((r) => r.ok).length
    console.log(`\nDONE — ${ok}/${results.length} sent`)
    const fails = results.filter((r) => !r.ok)
    if (fails.length) console.log('FAILURES:', JSON.stringify(fails, null, 2))
  }
}
main()
