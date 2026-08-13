#!/usr/bin/env node
/**
 * Code-driven personalized iOS push campaigns.
 *
 * Safe workflow:
 *   npm run push:campaign -- preview scripts/fixtures/push-campaign.example.json
 *   npm run push:campaign -- test scripts/fixtures/push-campaign.example.json --user=<uuid>
 *   # Check the physical iPhone before continuing.
 *   npm run push:campaign -- send scripts/fixtures/push-campaign.example.json --confirm=<campaignKey>
 *   npm run push:campaign -- status <campaignKey>
 *
 * Required env: PUSH_CAMPAIGN_SECRET
 * Optional env: PUSH_CAMPAIGN_API_URL (defaults to NEXT_PUBLIC_SITE_URL, then production)
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  try {
    for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
    }
  } catch { /* use the process environment */ }
}
loadEnv()

const SECRET = process.env.PUSH_CAMPAIGN_SECRET
const BASE_URL = (process.env.PUSH_CAMPAIGN_API_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://multiverseco.org').replace(/\/$/, '')
const OPERATOR = process.env.PUSH_CAMPAIGN_OPERATOR || ''

function arg(name) {
  return (process.argv.find((value) => value.startsWith(`--${name}=`)) || '').slice(name.length + 3)
}

function usage(message) {
  if (message) console.error(`\n❌ ${message}`)
  console.log(`
Usage:
  npm run push:campaign -- preview <spec.json>
  npm run push:campaign -- test <spec.json> --user=<voyager-profile-uuid>
  npm run push:campaign -- send <spec.json> --confirm=<campaignKey> [--batch=20]
  npm run push:campaign -- resume <campaignKey> [--batch=20]
  npm run push:campaign -- status <campaignKey>

The send command is rejected until the exact same campaign has delivered a test
notification within the previous 24 hours. Never put PUSH_CAMPAIGN_SECRET in Git.
`)
  process.exit(message ? 1 : 0)
}

function readSpec(path) {
  if (!path) usage('A campaign JSON file is required')
  try { return JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')) }
  catch (error) { throw new Error(`Could not read campaign spec: ${error.message}`) }
}

async function call(path, payload) {
  if (!SECRET || SECRET.length < 32) throw new Error('PUSH_CAMPAIGN_SECRET must be at least 32 characters')
  if (!/^[^\u0000-\u001f\u007f]{2,80}$/.test(OPERATOR)) throw new Error('PUSH_CAMPAIGN_OPERATOR must identify the sender')
  const parsedBase = new URL(BASE_URL)
  const local = ['localhost', '127.0.0.1', '::1'].includes(parsedBase.hostname)
  if (parsedBase.protocol !== 'https:' && !local) throw new Error('PUSH_CAMPAIGN_API_URL must use HTTPS')
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    redirect: 'error',
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
      'X-Push-Operator': OPERATOR,
    },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
  return data
}

function showSamples(result) {
  console.log(`\nEligible recipients: ${result.eligibleRecipients}`)
  for (const sample of result.samples || []) {
    console.log(`\n— ${sample.displayName} (${sample.userId})`)
    console.log(`  ${sample.title}`)
    console.log(`  ${sample.body}`)
    console.log(`  Opens: ${sample.route}`)
  }
}

async function drain(campaignKey, batchSize) {
  let batch = 0
  while (true) {
    batch++
    const result = await call('/api/push/campaign/process', { campaignKey, batchSize })
    const counts = result.counts
    console.log(`Batch ${batch}: processed=${result.processed}, sent=${counts.sent}, failed=${counts.failed}, skipped=${counts.skipped}, remaining=${counts.remaining}`)
    if (!counts.remaining) return counts
    if (!result.processed) throw new Error('No recipients were claimed while work remains; retry with resume')
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250))
  }
}

async function main() {
  const [, , command, value] = process.argv
  if (!command || command === '--help' || command === 'help') usage()
  const batchSize = Math.max(1, Math.min(25, Number(arg('batch') || 20)))

  if (command === 'status') {
    if (!value) usage('campaignKey is required')
    console.log(await call('/api/push/campaign', { action: 'status', campaignKey: value }))
    return
  }
  if (command === 'resume') {
    if (!value) usage('campaignKey is required')
    console.log(`\nResuming ${value} against ${BASE_URL}`)
    await drain(value, batchSize)
    return
  }

  const spec = readSpec(value)
  if (command === 'preview') {
    console.log(`\nPreviewing ${spec.campaignKey || '(invalid campaign)'} against ${BASE_URL}`)
    showSamples(await call('/api/push/campaign', { action: 'preview', spec }))
    return
  }
  if (command === 'test') {
    const testUserId = arg('user')
    if (!testUserId) usage('--user=<voyager-profile-uuid> is required')
    const result = await call('/api/push/campaign', { action: 'test', spec, testUserId })
    console.log(`\n✓ Test delivered to ${result.rendered.displayName}`)
    console.log(`  ${result.rendered.title}\n  ${result.rendered.body}\n  Opens: ${result.rendered.route}`)
    console.log(`\nCheck the physical iPhone. If correct, run:\n  npm run push:campaign -- send ${value} --confirm=${spec.campaignKey}`)
    return
  }
  if (command === 'send') {
    const confirm = arg('confirm')
    if (confirm !== spec.campaignKey) usage(`--confirm must exactly equal ${spec.campaignKey}`)
    console.log(`\nQueueing ${spec.campaignKey} against ${BASE_URL}`)
    const queued = await call('/api/push/campaign', { action: 'queue', spec, confirm })
    console.log(`✓ Queued ${queued.recipients} personalized notifications`)
    const counts = await drain(spec.campaignKey, batchSize)
    console.log(`\nDone: sent=${counts.sent}, failed=${counts.failed}, skipped=${counts.skipped}`)
    return
  }
  usage(`Unknown command: ${command}`)
}

main().catch((error) => {
  console.error(`\n❌ ${error.message}`)
  process.exit(1)
})
