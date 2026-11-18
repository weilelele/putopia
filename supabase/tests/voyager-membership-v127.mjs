// Disposable PostgreSQL only. No production services, configuration or user records.
import assert from 'node:assert/strict'
import { membershipFixture } from './voyager-membership-fixture.mjs'
const db = await membershipFixture(process.argv[2])
const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0]
const shop = 'putopia-fixture.myshopify.com'
let sequence = 500
const shipping = { name: 'Fixture Buyer', address: { line1: '1 Test St', country: 'US' } }
const reserve = (user, target, variant = 123) => scalar('select reserve_initiation_shopify_v3($1,$2,$3,$4,$5,null)', [user, shop, `gid://shopify/ProductVariant/${variant}`, 'member@example.com', target])
async function pay(order) {
  const number = ++sequence
  const binding = [order.id, shop, `gid://shopify/Order/${number}`, `gid://shopify/OrderTransaction/${number}`]
  const capture = `gid://shopify/OrderTransaction/${number + 1000}`
  assert.equal(await scalar('select bind_initiation_shopify_authorization($1,$2,$3,$4)', binding), true)
  const confirm = () => scalar('select confirm_initiation_shopify_capture($1,$2,$3,$4,$5,$6,$7)', [...binding, capture, new Date().toISOString(), order.order_kind === 'membership' ? null : shipping])
  assert.equal(await confirm(), order.id)
  assert.equal(await confirm(), order.id)
  return { order, binding, capture, confirm }
}
const reverse = (paid, amount, packs = [], canceled = false, review = false) => scalar('select reconcile_initiation_shopify_reversal($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
  [...paid.binding, paid.capture, new Date().toISOString(), new Date().toISOString(), amount, packs, canceled, review, paid.order.order_kind === 'membership' ? null : shipping])
async function human(index) {
  const id = `91270000-0000-4000-8000-${String(index).padStart(12, '0')}`
  await db.query("insert into voyager_profiles(id,role,account_kind) values($1,'applicant','human')", [id])
  return id
}
try {
  const user = await human(1)
  const before = Number(await scalar('select initiation_occupied_seats()'))
  const membership = await reserve(user, 'membership')
  assert.equal(membership.amount, 1200)
  assert.equal((await reserve(user, 'membership')).id, membership.id)
  assert.equal(Number(await scalar('select initiation_occupied_seats()')), before + 1)
  const base = await pay(membership)
  assert.equal(await scalar('select eligible_voyager_membership_order($1)', [user]), membership.id)
  assert.equal(await scalar('select count(*)::int from initiation_shipments where user_id=$1', [user]), 0)
  assert.equal(await scalar('select count(*)::int from initiation_entitlements where user_id=$1', [user]), 0)
  assert.equal(await scalar('select membership_private.access_role_for($1)', [user]), 'voyager')
  const initial = await reserve(user, 'initial', 124)
  assert.equal(initial.amount, 2600)
  assert.equal(initial.membership_order_id, base.order.id)
  const first = await pay(initial)
  assert.equal(await scalar('select count(*)::int from initiation_shipments where user_id=$1', [user]), 2)
  assert.equal(Number(await scalar('select initiation_occupied_seats()')), before + 1)
  assert.equal(await scalar('select eligible_initial_initiation_order($1)', [user]), initial.id)
  const last = await reserve(user, 'standard', 125)
  assert.equal(last.order_kind, 'legacy_upgrade')
  assert.equal(last.amount, 46000)
  const complete = await pay(last)
  assert.equal(await scalar('select count(*)::int from initiation_shipments where user_id=$1', [user]), 4)
  await reverse(complete, 46000, [3, 4])
  assert.equal(await scalar('select eligible_voyager_membership_order($1)', [user]), membership.id)
  assert.equal(await scalar('select active from initiation_entitlements where user_id=$1', [user]), false)
  await reverse(first, 2600, [1, 2])
  assert.equal(await scalar('select membership_private.access_role_for($1)', [user]), 'voyager')
  await reverse(base, 1200)
  assert.equal(await scalar('select membership_private.access_role_for($1)', [user]), 'applicant')
  assert.equal(Number(await scalar('select initiation_occupied_seats()')), before)
  await assert.rejects(base.confirm, /reversed/)
  const directUser = await human(2)
  const directBase = await pay(await reserve(directUser, 'membership'))
  const direct = await reserve(directUser, 'standard', 126)
  assert.equal(direct.amount, 47600)
  const directPaid = await pay(direct)
  await reverse(directPaid, 11900, [1])
  assert.equal(await scalar('select active from initiation_entitlements where user_id=$1', [directUser]), true)
  assert.equal(await scalar('select membership_private.access_role_for($1)', [directUser]), 'voyager')
  await reverse(directPaid, 47600, [1, 2, 3, 4])
  assert.equal(await scalar('select membership_private.access_role_for($1)', [directUser]), 'voyager')
  await reverse(directBase, 1200)
  assert.equal(await scalar('select membership_private.access_role_for($1)', [directUser]), 'applicant')
  const partialUser = await human(3)
  const partialBase = await pay(await reserve(partialUser, 'membership'))
  await reverse(partialBase, 100)
  assert.equal(await scalar('select membership_private.access_role_for($1)', [partialUser]), 'applicant')
  const empty = await human(4)
  await db.exec('set role authenticated')
  await assert.rejects(() => reserve(empty, 'membership'), /permission denied/)
  await db.exec('reset role')
  // Exercise the actual PostgREST database role and v124 access triggers.
  const rightsUser = await human(5)
  // Supabase default privileges on the pre-existing base tables/sequence.
  await db.exec('grant select,insert,update on voyager_profiles,voyager_orders,devices,device_order_packs to service_role; grant usage on sequence voyager_member_no_seq to service_role;')
  await db.exec('set role service_role')
  const rights = await pay(await reserve(rightsUser, 'membership'))
  assert.equal(await scalar('select membership_private.access_role_for($1)', [rightsUser]), 'voyager')
  assert.equal(await scalar('select sync_initiation_shopify_checkout_packs($1,$2,now(),$3)', [rights.order.id, rights.capture, {}]), 0)
  await db.exec('reset role')
  const asMember = async (sql, params = []) => {
    await db.query("select set_config('request.uid',$1,false)", [rightsUser])
    await db.exec('set role authenticated')
    try { return await scalar(sql, params) } finally { await db.exec('reset role') }
  }
  assert.equal(await asMember('select effective_access_role()'), 'voyager')
  await asMember('insert into dreamcatcher_jobs values($1) returning true', [rightsUser])
  await assert.rejects(() => asMember('insert into mission_acceptances values($1) returning true', [rightsUser]), /bound Multiverse Console/)
  await db.query('insert into devices(current_user_id) values($1)', [rightsUser])
  await asMember('insert into mission_acceptances values($1) returning true', [rightsUser])
  await db.exec('set role service_role')
  await reverse(rights, 1200)
  await db.exec('reset role')
  assert.equal(await asMember('select effective_access_role()'), 'applicant')
  await assert.rejects(() => asMember('insert into dreamcatcher_jobs values($1) returning true', [rightsUser]), /Voyager membership/)
  await assert.rejects(() => asMember('insert into mission_acceptances values($1) returning true', [rightsUser]), /Voyager membership/)
  // Refunded base Membership can be purchased again; the old receipt never revives.
  const rebought = await pay(await reserve(rightsUser, 'membership', 130))
  assert.notEqual(rebought.order.id, rights.order.id)
  await reverse(rights, 1200)
  assert.equal(await scalar('select eligible_voyager_membership_order($1)', [rightsUser]), rebought.order.id)
  // Existing $12 Pack is a different product with two Packs and a $460 upgrade.
  const historicalUser = await human(6)
  await db.query("insert into voyager_orders(user_id,product_type,status,amount,currency,paid_at,stripe_session_id,stripe_payment_intent) values($1,'voyager_pack','paid',1200,'usd',now(),'cs_live_old_12','pi_old_12')", [historicalUser])
  const oldUpgrade = await reserve(historicalUser, 'standard', 131)
  assert.equal(oldUpgrade.amount, 46000)
  assert.equal(oldUpgrade.membership_order_id, null)
  await pay(oldUpgrade)
  assert.equal(await scalar('select count(*)::int from initiation_shipments where user_id=$1', [historicalUser]), 4)
  // First successful event can already contain a refund. Never grant a fully refunded purchase.
  const lateUser = await human(7)
  const lateOrder = await reserve(lateUser, 'membership')
  const lateBinding = [lateOrder.id, shop, 'gid://shopify/Order/990', 'gid://shopify/OrderTransaction/990']
  assert.equal(await scalar('select bind_initiation_shopify_authorization($1,$2,$3,$4)', lateBinding), true)
  await reverse({order: lateOrder, binding: lateBinding, capture: 'gid://shopify/OrderTransaction/1990'}, 1200)
  assert.equal(await scalar('select membership_private.access_role_for($1)', [lateUser]), 'applicant')
  assert.equal(await scalar('select count(*)::int from initiation_members where user_id=$1', [lateUser]), 0)
  // A cancellation may arrive before the authorization webhook; it frees the reservation only.
  const voidUser = await human(8)
  const voidOrder = await reserve(voidUser, 'membership')
  await reverse({order: voidOrder, binding: [voidOrder.id, shop, 'gid://shopify/Order/991', 'gid://shopify/OrderTransaction/991'], capture: null}, 0, [], true)
  assert.equal(await scalar('select status from initiation_orders where id=$1', [voidOrder.id]), 'canceled')
  // Exact quote constraints reject NULL versions and creditless net offers.
  const quoteUser = await human(9)
  await assert.rejects(() => db.query("insert into initiation_orders(user_id,price_id,product_id,order_kind,amount,stripe_livemode) values($1,'price_bad','prod_bad','membership',1200,true)", [quoteUser]), /offer_check/)
  // A partial Pack refund received before the paid event atomically grants only valid rights.
  const earlyUser = await human(10)
  await pay(await reserve(earlyUser, 'membership'))
  const earlyOrder = await reserve(earlyUser, 'initial', 134)
  const earlyBinding = [earlyOrder.id, shop, 'gid://shopify/Order/992', 'gid://shopify/OrderTransaction/992']
  assert.equal(await scalar('select bind_initiation_shopify_authorization($1,$2,$3,$4)', earlyBinding), true)
  await reverse({order: earlyOrder, binding: earlyBinding, capture: 'gid://shopify/OrderTransaction/1992'}, 1300, [1])
  assert.equal(await scalar('select membership_private.access_role_for($1)', [earlyUser]), 'voyager')
  assert.equal(await scalar('select status from initiation_shipments where user_id=$1 and position=1', [earlyUser]), 'canceled')
  assert.equal(await scalar('select status from initiation_shipments where user_id=$1 and position=2', [earlyUser]), 'planned')
  // Membership can be reversed while an upgrade capture is in flight. Never revive access.
  const racingUser = await human(11)
  const racingBase = await pay(await reserve(racingUser, 'membership'))
  const racingOrder = await reserve(racingUser, 'initial', 135)
  const racingBinding = [racingOrder.id, shop, 'gid://shopify/Order/993', 'gid://shopify/OrderTransaction/993']
  assert.equal(await scalar('select bind_initiation_shopify_authorization($1,$2,$3,$4)', racingBinding), true)
  await reverse(racingBase, 1200)
  await assert.rejects(() => scalar('select confirm_initiation_shopify_capture($1,$2,$3,$4,$5,now(),$6)', [...racingBinding, 'gid://shopify/OrderTransaction/1993', shipping]), /reconciliation|credit/)
  assert.equal(await scalar('select membership_private.access_role_for($1)', [racingUser]), 'applicant')
  // Direct $38 Initial keeps membership after refunding only its $460 upgrade, and may retry.
  const physicalUser = await human(12)
  assert.equal((await pay(await reserve(physicalUser, 'initial', 136))).order.amount, 3800)
  const physicalUpgrade = await pay(await reserve(physicalUser, 'standard', 137))
  await reverse(physicalUpgrade, 46000, [3, 4])
  assert.equal(await scalar('select membership_private.access_role_for($1)', [physicalUser]), 'voyager')
  const physicalRetry = await pay(await reserve(physicalUser, 'standard', 137))
  assert.equal(physicalRetry.order.amount, 46000)
  assert.notEqual(physicalRetry.order.id, physicalUpgrade.order.id)
  assert.equal(await scalar('select count(*)::int from initiation_shipments where user_id=$1', [physicalUser]), 4)
  // At full capacity a newcomer is refused, an existing digital member still upgrades.
  await db.exec(`insert into voyager_profiles(id,role,account_kind)
    select ('91279999-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'voyager','human' from generate_series(1,100-initiation_occupied_seats()::integer) n;
    insert into initiation_members(user_id,batch,source,grant_note)
    select id,'S26','granted','Isolated capacity fixture' from voyager_profiles where id::text like '91279999-%';`)
  await assert.rejects(() => reserve(quoteUser, 'membership'), /fully reserved/)
  assert.equal((await reserve(rightsUser, 'initial', 133)).amount, 2600)
  console.log('v127 passed activation, service-role RPCs, v124 Parallax/Mission gates, 26/476/460 upgrades, legacy $12 Packs, seat capacity/reuse/release, refund-before-confirmation, retries, repurchase and quote tampering.')
} finally {
  await db.close()
}
