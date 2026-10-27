// Explicit isolated QA only. No cards, payment submission, live keys, or production database.
import fs from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { randomUUID, randomBytes } from 'node:crypto'
import assert from 'node:assert/strict'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const [envFile, stateFile, operation] = process.argv.slice(2)
assert.ok(envFile && stateFile && ['init', 'before', 'after', 'cleanup'].includes(operation), 'Usage: node initiation-latency.mjs <QA-env> <private-state-file> init|before|after|cleanup')
const env = parseEnv(await fs.readFile(envFile, 'utf8'))
assert.match(env.STRIPE_SECRET_KEY ?? '', /^(sk|rk|rkcs)_test_/)
assert.equal(new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname, 'gqcgdmmmmfbatdneacny.supabase.co')
const origin = 'https://putopia-stripe-meta-qa.vercel.app'
assert.equal(new URL(env.NEXT_PUBLIC_SITE_URL).origin, origin)
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { timeout: 15000, maxNetworkRetries: 1 })
assert.equal((await stripe.accounts.retrieve()).id, 'acct_1UTxRiAPEEV0NYJ8')
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 })
assert.equal(endpoints.has_more, false)
assert.ok(endpoints.data.every(endpoint => !endpoint.livemode && endpoint.status === 'disabled'))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
let state
if (operation === 'init') {
  const run = randomUUID()
  state = { run, startedAt: new Date().toISOString(), email: `latency-${run}@example.com`, guestEmail: `guest-${run}@example.com`, password: randomBytes(24).toString('base64url'), measurements: [] }
  const { data, error } = await db.auth.admin.createUser({ email: state.email, password: state.password, email_confirm: true, app_metadata: { signup_source: 'checkout_latency_qa' } })
  if (error) throw error
  state.userId = data.user.id
  const updated = await db.from('voyager_profiles').update({ registered_at: new Date().toISOString(), display_name: 'Checkout Latency QA' }).eq('id', state.userId)
  if (updated.error) throw updated.error
} else state = JSON.parse(await fs.readFile(stateFile, 'utf8'))

if (operation === 'before' || operation === 'after') {
  const jar = new Map()
  const auth = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: cookies => cookies.forEach(({ name, value }) => jar.set(name, value)),
  } })
  const login = await auth.auth.signInWithPassword({ email: state.email, password: state.password })
  if (login.error) throw login.error
  assert.equal(login.data.user.id, state.userId)
  const bundles = operation === 'before' ? ['initial', 'initial', 'initial', 'initial'] : ['initial', 'initial', 'initial', 'initial', 'standard', 'initial']
  const results = []
  for (const [index, bundle] of bundles.entries()) {
    const start = performance.now()
    const response = await fetch(`${origin}/api/initiation-checkout`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; ') },
      body: JSON.stringify({ bundle, analytics: { is_internal_qa: true, disabled: true, environment: 'preview' } }) })
    const data = await response.json()
    const elapsedMs = Math.round(performance.now() - start)
    assert.equal(response.status, 200, JSON.stringify(data))
    const url = new URL(data.url)
    assert.equal(url.origin, 'https://checkout.stripe.com')
    const sessionId = url.pathname.split('/').pop()
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    assert.equal(session.livemode, false)
    assert.equal(session.amount_total, bundle === 'initial' ? 3800 : 48800)
    assert.equal(session.metadata.user_id, state.userId)
    assert.equal(session.payment_status, 'unpaid')
    assert.equal(session.payment_intent, null)
    if (index > 0 && bundle === bundles[index - 1]) assert.equal(sessionId, results[index - 1].sessionId)
    if (index > 0 && bundle !== bundles[index - 1]) assert.equal((await stripe.checkout.sessions.retrieve(results[index - 1].sessionId)).status, 'expired')
    results.push({ bundle, elapsedMs, serverTiming: response.headers.get('server-timing'), sessionId, amount: session.amount_total })
  }
  state.measurements.push({ operation, at: new Date().toISOString(), results })
}

if (operation === 'cleanup') {
  const guest = await db.from('voyager_profiles').select('id').eq('email', state.guestEmail).maybeSingle()
  if (guest.error) throw guest.error
  state.cleanup = []
  for (const userId of [state.userId, guest.data?.id].filter(Boolean)) {
    const loaded = await db.from('initiation_orders').select('id,status,amount,stripe_session_id,stripe_payment_intent,paid_at').eq('user_id', userId).gte('created_at', state.startedAt)
    if (loaded.error) throw loaded.error
    for (const order of loaded.data) {
      assert.equal(order.stripe_payment_intent, null)
      assert.equal(order.paid_at, null)
      let session = await stripe.checkout.sessions.retrieve(order.stripe_session_id)
      assert.equal(session.livemode, false)
      assert.equal(session.metadata.user_id, userId)
      assert.equal(session.metadata.order_id, order.id)
      assert.equal(session.payment_status, 'unpaid')
      assert.equal(session.payment_intent, null)
      if (session.status === 'open') session = await stripe.checkout.sessions.expire(session.id)
      assert.equal(session.status, 'expired')
      const canceled = await db.from('initiation_orders').update({ status: 'canceled' }).eq('id', order.id).eq('user_id', userId).eq('status', 'pending').eq('stripe_session_id', session.id).is('paid_at', null).is('stripe_payment_intent', null)
      if (canceled.error) throw canceled.error
      state.cleanup.push({ orderId: order.id, sessionId: session.id, amount: order.amount, status: 'canceled', stripeStatus: 'expired', paymentStatus: 'unpaid', livemode: false })
    }
  }
}
await fs.writeFile(stateFile, JSON.stringify(state, null, 2), { mode: 0o600 })
console.log(JSON.stringify({ operation, measurements: state.measurements, cleanup: state.cleanup ?? null }))
