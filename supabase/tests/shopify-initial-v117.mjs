// Disposable in-memory PostgreSQL only. Pass the installed PGlite module path.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { readPilotOrder } from '../../scripts/shopify/initial-pilot-order.mjs'

const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const uid = '53000000-0000-4000-8000-000000000001'
const other = '53000000-0000-4000-8000-000000000002'
const completeUser = '53000000-0000-4000-8000-000000000003'
const shop = 'putopia-fixture.myshopify.com'
const orderId = 'gid://shopify/Order/38'
const email = 'pilot@example.com'
const config = { orderId, email }
const money = amount => ({ shopMoney: { amount, currencyCode: 'USD' }, presentmentMoney: { amount, currencyCode: 'USD' } })
const connection = nodes => ({ nodes, pageInfo: { hasNextPage: false } })
const payment = { id: 'charge', kind: 'CAPTURE', status: 'SUCCESS', test: true, gateway: 'shopify_payments', processedAt: '2026-11-10T00:00:00Z', amountSet: money('38.00') }
const lines = [1, 2].map(position => ({ id: `line-${position}`, sku: `INITIAL-PACK-${position}`, quantity: 1, requiresShipping: true, originalUnitPriceSet: money('19.00') }))
const order = {
  id: orderId, test: true, email, updatedAt: payment.processedAt, displayFinancialStatus: 'PAID',
  shippingAddress: { countryCodeV2: 'US', provinceCode: 'CA', zip: '95054' },
  totalPriceSet: money('38'), totalShippingPriceSet: money('0'), totalDiscountsSet: money('0'),
  lineItems: connection(lines), transactions: [payment], refunds: [], fulfillments: [],
}
const shipment = (position, displayStatus) => ({
  status: 'SUCCESS', displayStatus,
  trackingInfo: [{ number: `test-${position}`, url: `https://example.com/track/${position}` }],
  fulfillmentLineItems: connection([{ quantity: 1, lineItem: { id: `line-${position}` } }]),
})
const refund = (position, status = 'SUCCESS') => ({
  refundLineItems: connection([{ quantity: 1, lineItem: { id: `line-${position}` } }]),
  transactions: connection([{ ...payment, kind: 'REFUND', status, parentTransaction: { id: payment.id }, amountSet: money('19') }]),
})
const snapshot = readPilotOrder(order, config)
const firstLabel = readPilotOrder({ ...order, fulfillments: [shipment(1, 'LABEL_PURCHASED')] }, config)
const labeled = readPilotOrder({
  ...order, fulfillments: [shipment(1, 'LABEL_PURCHASED'), shipment(2, 'FULFILLED')],
}, config)
assert.deepEqual(Object.values(labeled.packs).map(pack => pack.status), ['preparing', 'preparing'])
const partial = readPilotOrder({
  ...order, displayFinancialStatus: 'PARTIALLY_REFUNDED', updatedAt: '2026-11-10T00:05:00Z',
  refunds: [refund(2)], fulfillments: [shipment(1, 'CARRIER_PICKED_UP')],
}, config)
const full = readPilotOrder({
  ...order, displayFinancialStatus: 'REFUNDED', updatedAt: '2026-11-10T00:10:00Z',
  refunds: [refund(2), refund(1)], fulfillments: [shipment(1, 'DELIVERED')],
}, config)
assert.deepEqual(partial.refundedPacks, [2])
assert.deepEqual(full.refundedPacks, [1, 2])
assert.deepEqual(readPilotOrder({ ...order, refunds: [refund(2, 'PENDING')] }, config).refundedPacks, [])
assert.throws(() => readPilotOrder({ ...order, test: false }, config), /test order/)
assert.throws(() => readPilotOrder(order, { ...config, email: 'other@example.com' }), /email/)
assert.throws(() => readPilotOrder({ ...order, transactions: [{ ...payment, kind: 'AUTHORIZATION' }] }, config), /capture/)
assert.throws(() => readPilotOrder({ ...order, transactions: [{ ...payment, test: false }] }, config), /test capture/)
assert.throws(() => readPilotOrder({ ...order, shippingAddress: { ...order.shippingAddress, provinceCode: 'HI' } }, config), /contiguous/)
assert.throws(() => readPilotOrder({ ...order, totalPriceSet: money('41') }, config), /\$38/)
assert.throws(() => readPilotOrder({ ...order, lineItems: connection([lines[0], { ...lines[1], sku: lines[0].sku }]) }, config), /one Pack 1 and one Pack 2/)
assert.throws(() => readPilotOrder({ ...order, fulfillments: [
  { ...shipment(1, 'FULFILLED'), fulfillmentLineItems: connection(lines.map(line => ({ quantity: 1, lineItem: line }))) },
] }, config), /separately/)

try {
  const harness = await fs.readFile(new URL('./initiation-v90.mjs', import.meta.url), 'utf8')
  const blocks = [...harness.matchAll(/await db\.exec\(`([\s\S]*?)`\)/g)].slice(0, 2)
  assert.equal(blocks.length, 2)
  for (const block of blocks) await db.exec(block[1])
  for (const version of ['83_initiation', '85_initiation_roster', '90', '87_npc_initiation', '88', '89', '91', '94', '102', '103', '105', '107', '108', '116', '117', '118']) {
    await db.exec(await fs.readFile(new URL(`../schema_v${version}.sql`, import.meta.url), 'utf8'))
  }
  const rows = async (query, params = []) => (await db.query(query, params)).rows
  const scalar = async (query, params = []) => Object.values((await rows(query, params))[0])[0]
  const sync = (data, user = uid, id = orderId) => scalar('select sync_shopify_initial_pilot($1,$2,$3,$4,$5,$6,$7)', [
    shop, id, user, data.paidAt, data.updatedAt, data.refundedPacks, data.packs,
  ])
  const access = user => scalar('select membership_private.access_role_for($1)', [user])
  const states = receipt => rows('select status,tracking_url from initiation_shipments where order_id=$1 order by position', [receipt])
  for (const user of [uid, other, completeUser]) {
    await rows("insert into voyager_profiles(id,role,account_kind) values($1,'applicant','human')", [user])
  }
  await assert.rejects(() => sync(snapshot), /closed test-mode/)
  await db.exec('update initiation_batches set stripe_livemode=false, checkout_open=true')
  await assert.rejects(() => sync(snapshot), /closed test-mode/)
  await db.exec('update initiation_batches set checkout_open=false')
  await db.exec('grant select,update on voyager_profiles to service_role; grant select on voyager_orders to service_role')
  await db.exec('set role service_role')
  const receipt = (await sync(snapshot)).order_id
  assert.equal((await sync(snapshot)).order_id, receipt)
  const completeId = 'gid://shopify/Order/488'
  const completeLines = [...lines,
    { ...lines[0], id: 'line-3', sku: 'COMPLETE-PACK-3', originalUnitPriceSet: money('450.00') },
    { ...lines[0], id: 'line-4', sku: 'COMPLETE-PACK-4', originalUnitPriceSet: money('0.00') },
  ]
  const completeConfig = { ...config, orderId: completeId, kind: 'standard' }
  const completeOrder = {
    ...order, id: completeId, totalPriceSet: money('488.00'),
    shippingAddress: { ...order.shippingAddress, name: 'Pilot Recipient', address1: '1 Test St', city: 'Santa Clara' },
    lineItems: connection(completeLines),
    transactions: [{ ...payment, amountSet: money('488.00') }],
  }
  const completeSnapshot = readPilotOrder(completeOrder, completeConfig)
  const completeSync = async data => scalar('select sync_shopify_bundle_pilot($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
    shop, completeId, completeUser, data.paidAt, data.updatedAt, data.refundedPacks, data.packs, 'standard', data.shipping,
  ])
  assert.throws(() => readPilotOrder({ ...completeOrder, lineItems: connection(completeLines.slice(0, 3)) }, completeConfig), /exactly 4/)
  assert.throws(() => readPilotOrder({ ...completeOrder, refunds: [refund(2)] }, completeConfig), /unrefunded/)
  const completeReceipt = (await completeSync(completeSnapshot)).order_id
  assert.equal(await scalar('select active from initiation_entitlements where order_id=$1', [completeReceipt]), true)
  assert.deepEqual((await states(completeReceipt)).map(x => x.status), Array(4).fill('planned'))
  const completeFulfillment = readPilotOrder({
    ...completeOrder, fulfillments: [shipment(4, 'DELIVERED'), shipment(2, 'FULFILLED'), shipment(3, 'IN_TRANSIT'), shipment(1, 'LABEL_PURCHASED')],
  }, completeConfig)
  assert.equal((await completeSync(completeFulfillment)).order_id, completeReceipt)
  assert.deepEqual((await rows('select position,status,tracking_number from initiation_shipments where order_id=$1 order by position', [completeReceipt])),
    ['preparing','preparing','dispatched','delivered'].map((status,i) => ({ position: i+1, status, tracking_number: `test-${i+1}` })))
  await db.exec('reset role')
  assert.equal(await access(completeUser), 'voyager')
  assert.equal(await access(uid), 'voyager')
  assert.equal(await scalar('select effective_access_role() from set_config($1,$2,false)', ['request.uid', uid]), 'voyager')
  assert.equal(await scalar('select count(*)::int from initiation_orders where user_id=$1', [uid]), 1)
  assert.equal(await scalar('select count(*)::int from initiation_entitlements where user_id=$1', [uid]), 0)
  assert.equal(await scalar('select status from initiation_analytics_outbox where order_id=$1', [receipt]), 'skipped')
  assert.deepEqual(await states(receipt), [{ status: 'planned', tracking_url: null }, { status: 'planned', tracking_url: null }])
  await assert.rejects(() => sync(snapshot, other), /another account/)
  await assert.rejects(() => sync(snapshot, uid, 'gid://shopify/Order/39'), /fresh test account/)
  await sync(firstLabel)
  assert.deepEqual(await states(receipt), [
    { status: 'preparing', tracking_url: 'https://example.com/track/1' },
    { status: 'planned', tracking_url: null },
  ])
  assert.equal(await scalar('select tracking_number from initiation_shipments where order_id=$1 and position=1', [receipt]), 'test-1')
  await sync(labeled)
  assert.deepEqual((await states(receipt)).map(pack => pack.tracking_url), ['https://example.com/track/1', 'https://example.com/track/2'])
  await sync(partial)
  assert.equal(await access(uid), 'voyager')
  assert.deepEqual(await states(receipt), [
    { status: 'dispatched', tracking_url: 'https://example.com/track/1' },
    { status: 'canceled', tracking_url: null },
  ])
  assert.equal(await scalar('select tracking_number from initiation_shipments where order_id=$1 and position=2', [receipt]), null)
  await sync(full)
  assert.equal(await access(uid), 'applicant')
  assert.equal(await scalar('select status from initiation_orders where id=$1', [receipt]), 'refunded')
  assert.deepEqual((await states(receipt)).map(pack => pack.status), ['delivered', 'canceled'])
  assert.equal((await sync(snapshot)).result, 'older_snapshot_ignored')
  await assert.rejects(() => sync({ ...snapshot, updatedAt: '2026-11-10T00:15:00Z' }), /cannot be reversed/)
  assert.equal(await access(uid), 'applicant')
  for (const role of ['anon', 'authenticated']) {
    assert.equal(await scalar("select has_function_privilege($1,'public.sync_shopify_initial_pilot(text,text,uuid,timestamptz,timestamptz,integer[],jsonb)','execute')", [role]), false)
  }
  console.log('Shopify pilot passed: payment checks, local activation, distinct packages, partial/full refunds, replay, access control')
} finally {
  await db.close()
}
