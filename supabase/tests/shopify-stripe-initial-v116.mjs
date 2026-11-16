// Isolated PostgreSQL and synthetic payment and carrier evidence. Pass the PGlite module path.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { checkCapturedInitial, readShopifyShipments, stripeOrderTag } from '../../scripts/shopify/stripe-initial-fulfillment.mjs'

const userId = '11600000-0000-4000-8000-000000000001'
const email = 'pilot@example.com'
const shopRef = 'pilot-example.myshopify.com/16'
const shipping = { name: 'Test Recipient', address: { line1: '1 Fixture Street', city: 'Chicago', state: 'IL', postal_code: '60601', country: 'US' } }
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0]
const connection = nodes => ({ nodes, pageInfo: { hasNextPage: false } })

try {
  const harness = await readFile(new URL('./initiation-v90.mjs', import.meta.url), 'utf8')
  const blocks = [...harness.matchAll(/await db\.exec\(`([\s\S]*?)`\)/g)].slice(0, 2)
  assert.equal(blocks.length, 2)
  for (const block of blocks) await db.exec(block[1])
  for (const migration of ['83_initiation', '85_initiation_roster', '90', '87_npc_initiation', '88', '89', '91', '94', '103', '105', '107', '108', '116']) {
    await db.exec(await readFile(new URL(`../schema_v${migration}.sql`, import.meta.url), 'utf8'))
  }
  await db.query("insert into voyager_profiles(id,role,account_kind) values ($1,'applicant','human')", [userId])
  await db.exec('update initiation_batches set checkout_open=true')
  const reserved = await scalar("select reserve_initiation_v2($1,'price_fixture','prod_fixture','initial',null)", [userId])
  await db.query("select complete_initiation($1,'cs_live_fixture',$2,'pi_fixture',$3)", [reserved.id, userId, shipping])
  const order = await scalar('select to_jsonb(o) from initiation_orders o where id=$1', [reserved.id])
  const intent = { id: 'pi_fixture', livemode: true, status: 'succeeded', currency: 'usd', amount_received: 3800,
    metadata: { order_id: order.id, user_id: userId, order_kind: 'initial' },
    latest_charge: { status: 'succeeded', captured: true, amount_captured: 3800, amount_refunded: 0, disputed: false } }
  const shopify = {
    test: false, cancelledAt: null, tags: [stripeOrderTag(order.id)], displayFinancialStatus: 'PAID', email,
    shippingAddress: { name: 'Test Recipient', address1: '1 Fixture Street', city: 'Chicago', provinceCode: 'IL', zip: '60601', countryCodeV2: 'US' },
    totalPriceSet: { shopMoney: { currencyCode: 'USD', amount: '38.00' } },
    transactions: [{ status: 'SUCCESS', kind: 'SALE', manualPaymentGateway: true, test: false }],
    lineItems: connection([1, 2].map(n => ({ id: `line-${n}`, sku: `INITIAL-PACK-${n}`, quantity: 1, requiresShipping: true }))),
    fulfillments: [],
  }
  const fulfill = (n, displayStatus) => ({
    status: 'SUCCESS', displayStatus, trackingInfo: [{ number: `NUMBER${n}`, url: `https://example.com/tracking/${n}` }],
    fulfillmentLineItems: connection([{ quantity: 1, lineItem: { id: `line-${n}` } }]),
  })
  const read = fulfillments => readShopifyShipments({ ...shopify, fulfillments }, order, email)
  const sync = (packs, ref = shopRef) => scalar('select sync_shopify_initial_shipments($1,$2,$3)', [order.id, ref, packs])
  const states = () => scalar("select jsonb_agg(jsonb_build_array(status,tracking_number) order by position) from initiation_shipments where order_id=$1", [order.id])
  checkCapturedInitial(order, intent)
  assert.throws(() => checkCapturedInitial(order, { ...intent, status: 'requires_capture' }), /captured/)
  assert.throws(() => checkCapturedInitial(order, { ...intent, latest_charge: { ...intent.latest_charge, amount_refunded: 1900 } }), /zero refunds/)
  assert.throws(() => readShopifyShipments({ ...shopify, test: true }, order, email), /live Shopify/)
  assert.throws(() => readShopifyShipments({ ...shopify, transactions: [{ ...shopify.transactions[0], manualPaymentGateway: false }] }, order, email), /external payment/)
  assert.throws(() => readShopifyShipments({ ...shopify, shippingAddress: { ...shopify.shippingAddress, zip: '60602' } }, order, email), /recipient/)
  assert.throws(() => readShopifyShipments(shopify, order, 'other@example.com'), /recipient/)
  const bothInOne = { ...fulfill(1, 'FULFILLED'), fulfillmentLineItems: connection([1, 2].map(n => ({ quantity: 1, lineItem: { id: `line-${n}` } }))) }
  assert.throws(() => read([bothInOne]), /separate fulfillments/)

  assert.equal(await sync(read([])), 0)
  const pack1 = read([fulfill(1, 'LABEL_PURCHASED')])
  assert.equal(await sync(pack1), 1)
  assert.deepEqual(await states(), [['preparing', 'NUMBER1'], ['planned', null]])
  assert.equal(await sync(pack1), 0)
  const split = read([fulfill(1, 'CARRIER_PICKED_UP'), fulfill(2, 'FULFILLED')])
  assert.equal(await sync(split), 2)
  assert.deepEqual(await states(), [['dispatched', 'NUMBER1'], ['preparing', 'NUMBER2']])
  assert.equal(await sync(pack1), 0)
  await assert.rejects(() => sync(split, 'pilot-example.myshopify.com/17'), /different Shopify order/)
  await assert.rejects(() => sync({ ...split, 1: { ...split[1], trackingNumber: 'REPLACED' } }), /different dispatched tracking/)
  await db.query("select record_initiation_refund('pi_fixture',3800,1900)")
  await assert.rejects(() => sync(split), /ineligible/)
  for (const role of ['anon', 'authenticated', 'service_role']) {
    assert.equal(await scalar("select has_function_privilege($1,'public.sync_shopify_initial_shipments(uuid,text,jsonb)','execute')", [role]), role === 'service_role')
  }
  console.log('Passed: existing Stripe purchase, Shopify external payment, split Packs, replay, refund hold, and tracking permissions')
} finally {
  await db.close()
}
