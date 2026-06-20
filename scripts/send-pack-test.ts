#!/usr/bin/env tsx
/**
 * One-off TEST send of the Initial Voyager Pack confirmation email.
 *
 *   npx tsx scripts/send-pack-test.ts <to> [name]
 *
 * Reads RESEND_API_KEY / RESEND_FROM / NEXT_PUBLIC_SITE_URL from .env.local.
 * Sends a single message via the Resend REST API. Not for bulk use.
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

const to = process.argv[2]
const name = process.argv[3]
if (!to) { console.error('usage: tsx scripts/send-pack-test.ts <to> [name]'); process.exit(1) }

const FROM = process.env.RESEND_FROM || 'Multiverse Collective <architect@multiverseco.org>'
const API_KEY = process.env.RESEND_API_KEY
if (!API_KEY) { console.error('RESEND_API_KEY missing'); process.exit(1) }

// For a test, route replies to the real From inbox (architect@) rather than the
// not-yet-provisioned voyagers@ default baked into the module.
const REPLY_TO = process.env.COLLECTIVE_REPLY_TO || FROM.replace(/^.*<|>.*$/g, '')

const { subject, html, text } = buildVoyagerPackEmail({ name })

async function main() {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html, text, reply_to: REPLY_TO }),
  })

  const body = await res.json()
  if (!res.ok) { console.error('SEND FAILED', res.status, body); process.exit(1) }
  console.log('SENT', { to, from: FROM, reply_to: REPLY_TO, subject, id: body.id })
}

main()
