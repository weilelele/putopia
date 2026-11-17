// Production migrations only, with synthetic live payment and two-/four-Pack records.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { CURRENT_STRIPE_BUNDLES, checkCapturedStripeBundle, readShopifyShipments, stripeOrderTag } from '../../scripts/shopify/stripe-initial-fulfillment.mjs'

const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0]
const shipping = { name: 'Test Recipient', address: { line1: '1 Fixture Street', city: 'Chicago', state: 'IL', postal_code: '60601', country: 'US' } }
const email = 'pilot@example.com'
const connection = nodes => ({ nodes, pageInfo: { hasNextPage: false } })
const shop = 'pilot-example.myshopify.com'

try {
  const harness = await readFile(new URL('./initiation-v90.mjs', import.meta.url), 'utf8')
  const blocks = [...harness.matchAll(/await db\.exec\(`([\s\S]*?)`\)/g)].slice(0, 2)
  assert.equal(blocks.length, 2)
  for (const block of blocks) await db.exec(block[1])
  for (const migration of ['83_initiation', '85_initiation_roster', '90', '87_npc_initiation', '88', '89', '91', '94', '103', '105', '107', '108', '116', '119']) {
    await db.exec(await readFile(new URL(`../schema_v${migration}.sql`, import.meta.url), 'utf8'))
  }
  await db.exec('update initiation_batches set checkout_open=true')

  for (const [index, [kind, offer]] of Object.entries(CURRENT_STRIPE_BUNDLES).entries()) {
    const userId = `11900000-0000-4000-8000-00000000000${index + 1}`
    const intentId = `pi_fixture${index}`
    const ref = `${shop}/${index + 10}`
    await db.query("insert into voyager_profiles(id,role,account_kind) values ($1,'applicant','human')", [userId])
    const reserved = await scalar("select reserve_initiation_v2($1,'price_fixture','prod_fixture',$2,null)", [userId, kind])
    await db.query('select complete_initiation($1,$2,$3,$4,$5)', [reserved.id, `cs_live_fixture${index}`, userId, intentId, shipping])
    const order = await scalar('select to_jsonb(o) from initiation_orders o where id=$1', [reserved.id])
    const intent = { id: intentId, livemode: true, status: 'succeeded', currency: 'usd', amount_received: offer.amount,
      metadata: { order_id: order.id, order_kind: kind },
      latest_charge: { status: 'succeeded', captured: true, amount_captured: offer.amount, amount_refunded: 0, disputed: false } }
    const session = { id: order.stripe_session_id, payment_intent: intentId, client_reference_id: userId,
      metadata: { ...intent.metadata, user_id: userId } }
    checkCapturedStripeBundle(order, intent, session)
    assert.throws(() => checkCapturedStripeBundle(order, intent, { ...session, client_reference_id: 'other-user' }), /captured/)
    const reserve = () => scalar('select reserve_shopify_stripe_order_import($1,$2)', [order.id, shop])
    const sync = (packs, stamp = '2026-11-16T00:00:00Z', shopRef = ref) => scalar(
      'select sync_shopify_stripe_bundle_shipments($1,$2,$3,$4)', [order.id, shopRef, stamp, packs])
    await assert.rejects(() => sync({}), /not reserved/)
    assert.equal(await reserve(), true)
    assert.equal(await reserve(), false)
    assert.equal(await sync({}), 0)
    await assert.rejects(() => reserve(), /unlinked/)

    const shopify = {
      test: false, cancelledAt: null, tags: [stripeOrderTag(order.id)], displayFinancialStatus: 'PAID', email,
      shippingAddress: { name: 'Test Recipient', address1: '1 Fixture Street', city: 'Chicago', provinceCode: 'IL', zip: '60601', countryCodeV2: 'US' },
      totalPriceSet: { shopMoney: { currencyCode: 'USD', amount: String(offer.amount / 100) } },
      transactions: [{ status: 'SUCCESS', kind: 'SALE', gateway: 'manual', test: false }],
      lineItems: connection(offer.skus.map((sku, i) => ({ id: `line-${i + 1}`, sku, quantity: 1, requiresShipping: true }))),
      fulfillments: offer.skus.map((_, i) => ({
        status: 'SUCCESS', displayStatus: 'CARRIER_PICKED_UP', trackingInfo: [{ number: `TRACK-${i + 1}`, url: `https://example.com/tracking/${i + 1}` }],
        fulfillmentLineItems: connection([{ quantity: 1, lineItem: { id: `line-${i + 1}` } }]),
      })),
    }
    const packs = readShopifyShipments(shopify, order, email)
    assert.equal(await sync({ 1: packs[1] }), 1)
    assert.equal(await sync(packs), offer.skus.length - 1)
    assert.equal(await sync(packs), 0)
    assert.deepEqual(await scalar('select array_agg(tracking_number order by position) from initiation_shipments where order_id=$1', [order.id]),
      offer.skus.map((_, i) => `TRACK-${i + 1}`))
    await assert.rejects(() => sync({}, undefined, `${shop}/999`), /not reserved/)
    await assert.rejects(() => sync({ 1: { ...packs[1], trackingNumber: 'REPLACED' } }), /changed after dispatch/)
    assert.equal(await sync({ 1: { ...packs[1], trackingNumber: 'STALE' } }, '2026-11-15T00:00:00Z'), 0)
    await db.query('select record_initiation_refund($1,$2,1)', [intentId, offer.amount])
    await assert.rejects(() => sync(packs), /not an eligible paid/)
  }
  for (const role of ['anon', 'authenticated', 'service_role']) {
    assert.equal(await scalar("select has_function_privilege($1,'public.reserve_shopify_stripe_order_import(uuid,text)','execute')", [role]), role === 'service_role')
    assert.equal(await scalar("select has_function_privilege($1,'public.sync_shopify_stripe_bundle_shipments(uuid,text,timestamptz,jsonb)','execute')", [role]), role === 'service_role')
  }
  console.log('Passed: production Initial and Complete import reservation, split tracking, replay, stale updates, refunds, and service role grants')
} finally {
  await db.close()
}
