// Actual Next runtime, actual Supabase cookie adapter and Stripe signed Webhooks.
// Temp copy excludes every project env file. Only analytics are disabled in the copy.
import fs from 'node:fs/promises'
import path from 'node:path'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { parseEnv } from 'node:util'
import assert from 'node:assert/strict'
import Stripe from 'stripe'
const base = '/private/tmp/putopia-initiation-sandbox', copy = '/private/tmp/putopia-initiation-full-next'
const root = path.resolve(import.meta.dirname, '../..')
const local = parseEnv(await fs.readFile(`${base}/local.env`, 'utf8'))
const credentials = parseEnv(await fs.readFile(`${base}/stripe.env`, 'utf8'))
assert.equal(new URL(local.API_URL).hostname, '127.0.0.1')
assert.match(credentials.STRIPE_SECRET_KEY, /^(sk|rk|rkcs)_test_/)
const site = (await fs.readFile(`${base}/tunnel.log`, 'utf8')).match(/https:\/\/[a-z-]+\.trycloudflare\.com/)?.[0]
assert.ok(site)
const stripe = new Stripe(credentials.STRIPE_SECRET_KEY)
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 })
assert.equal(endpoints.has_more, false); assert.equal(endpoints.data.filter(e => e.status === 'enabled').length, 0)
const products = await stripe.products.list({ limit: 100 })
const product = products.data.find(p => p.metadata.verification === 'initiation-isolated')
assert.ok(product)
const prices = (await stripe.prices.list({ product: product.id, limit: 20 })).data
await fs.mkdir(copy, { recursive: true })
if (!process.argv.includes('--reuse-copy')) {
  for (const dir of ['src', 'public']) await fs.cp(path.join(root, dir), path.join(copy, dir), { recursive: true })
  for (const name of await fs.readdir(root)) if (/^(package.*\.json|tsconfig\.json|next\.config\..*|postcss\.config\..*|next-env\.d\.ts)$/.test(name)) await fs.copyFile(path.join(root, name), path.join(copy, name))
}
try { await fs.symlink(path.join(root, 'node_modules'), path.join(copy, 'node_modules'), 'dir') } catch (error) { if (error.code !== 'EEXIST') throw error }
await fs.writeFile(path.join(copy, 'src/components/ad-pixels.tsx'), 'export function AdPixels() { return null }\n')
await fs.writeFile(path.join(copy, 'src/instrumentation-client.ts'), 'export function onRouterTransitionStart() {}\n')
const configPath = path.join(copy, 'next.config.ts')
const config = await fs.readFile(configPath, 'utf8')
if (!config.includes('allowedDevOrigins')) await fs.writeFile(configPath, config.replace('output: "standalone",', `output: "standalone", allowedDevOrigins: [${JSON.stringify(new URL(site).hostname)}],`))
const environment = { PATH: process.env.PATH, XDG_CONFIG_HOME: `${base}/config`, NEXT_TELEMETRY_DISABLED: '1', ...credentials,
  NEXT_PUBLIC_SITE_URL: site, NEXT_PUBLIC_SUPABASE_URL: `${site}/__sandbox_supabase`, NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY, STRIPE_INITIATION_PRODUCT_ID: product.id,
  STRIPE_INITIATION_PRICE_ID: prices.find(p => p.unit_amount === 52000).id, STRIPE_INITIATION_UPGRADE_PRICE_ID: prices.find(p => p.unit_amount === 40000).id,
  INITIATION_CHECKOUT_ENABLED: 'true', INITIATION_TERMS_APPROVED: 'true', INITIATION_FULFILLMENT_POLICY_APPROVED: 'true',
  INITIATION_SHIPPING_COUNTRIES: 'US', INITIATION_SHIPPING_POLICY: 'included', INITIATION_TAX_POLICY: 'included', INITIATION_TERMS_URL: `${site}/terms/initiation` }
const listener = spawn('stripe', ['listen', '--forward-to', 'http://127.0.0.1:4344/api/stripe/webhook', '--events', 'checkout.session.completed,checkout.session.expired,payment_intent.amount_capturable_updated,payment_intent.succeeded,payment_intent.canceled,charge.refunded'], { env: { PATH: process.env.PATH, XDG_CONFIG_HOME: `${base}/config`, STRIPE_API_KEY: credentials.STRIPE_SECRET_KEY } })
let output = ''
for (const stream of [listener.stdout, listener.stderr]) stream.on('data', chunk => { output += chunk.toString() })
for (let i = 0; i < 100 && !output.match(/whsec_[A-Za-z0-9]+/); i++) await new Promise(resolve => setTimeout(resolve, 100))
environment.STRIPE_WEBHOOK_SECRET = output.match(/whsec_[A-Za-z0-9]+/)?.[0]
assert.ok(environment.STRIPE_WEBHOOK_SECRET)
const log = await fs.open(`${base}/full-next.log`, 'w', 0o600)
if (process.argv.includes('--production')) {
  const build = spawn('npm', ['run', 'build'], { cwd: copy, env: environment, stdio: ['ignore', log.fd, log.fd] })
  assert.equal(await new Promise(resolve => build.once('exit', resolve)), 0)
}
const next = spawn('npm', ['run', process.argv.includes('--production') ? 'start' : 'dev', '--', ...(process.argv.includes('--production') ? [] : ['--webpack']), '--hostname', '127.0.0.1', '--port', '4344'], { cwd: copy, env: environment, stdio: ['ignore', log.fd, log.fd] })
const proxy = http.createServer((req, res) => {
  const isAuth = req.url.startsWith('/__sandbox_supabase/')
  const target = new URL(isAuth ? req.url.slice('/__sandbox_supabase'.length) : req.url, isAuth ? local.API_URL : 'http://127.0.0.1:4344')
  const upstream = http.request(target, { method: req.method, headers: { ...req.headers, host: isAuth ? target.host : new URL(site).host } }, received => { res.writeHead(received.statusCode, received.headers); received.pipe(res) })
  upstream.on('error', () => { res.writeHead(502); res.end('Sandbox upstream unavailable') }); req.pipe(upstream)
})
await new Promise(resolve => proxy.listen(4345, '127.0.0.1', resolve))
await fs.writeFile(`${base}/full-runtime.json`, JSON.stringify({ site, copy, nextPid: next.pid, listenerPid: listener.pid }), { mode: 0o600 })
console.log(JSON.stringify({ site, runtime: 'actual Next', cookies: 'actual Supabase SSR adapter', emailCredentials: 'absent', analytics: 'disabled in copy' }))
await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve) })
listener.kill(); next.kill(); proxy.close(); await log.close()
