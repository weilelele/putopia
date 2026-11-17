// Disposable Postgres only. Pass the installed PGlite module path as the first argument.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0]
const shop = 'putopia-fixture.myshopify.com'
const address = { name: 'Fixture Buyer', address: { line1:'1 Test St', country:'US' } }
const reserve = (user, kind) => scalar('select reserve_initiation_shopify_v2($1,$2,$3,$4,$5,$6)',
  [user,shop,`gid://shopify/ProductVariant/${kind === 'initial' ? 88 : 99}`,'checkout@example.com',kind,null])
const bind = args => scalar('select bind_initiation_shopify_authorization($1,$2,$3,$4)', args)

try {
  const harness = await readFile(new URL('./initiation-v90.mjs', import.meta.url), 'utf8')
  const blocks = [...harness.matchAll(/await db\.exec\(`([\s\S]*?)`\)/g)].slice(0, 2)
  assert.equal(blocks.length, 2)
  for (const block of blocks) await db.exec(block[1])
  for (const version of ['83_initiation','85_initiation_roster','90','87_npc_initiation','88','89','91','94','102','103','105','107','108','116','119','120','122','123']) {
    await db.exec(await readFile(new URL(`../schema_v${version}.sql`, import.meta.url), 'utf8'))
  }
  await db.exec("update initiation_batches set checkout_open=true,stripe_livemode=true where label='S26'")
  for (const [i,kind,count] of [[1,'initial',2],[2,'standard',4],[3,'initial',2],[4,'standard',4]]) {
    const user = `81200000-0000-4000-8000-00000000000${i}`
    await db.query("insert into voyager_profiles(id,role,account_kind) values($1,'applicant','human')",[user])
    if (i === 4) {
      await scalar("select reserve_initiation_v2($1,'price_stripe','prod_stripe','standard',null)",[user])
      await assert.rejects(() => reserve(user, kind), /existing payment/)
      continue
    }
    const order = await reserve(user,kind)
    assert.equal((await reserve(user,kind)).id,order.id)
    const binding = [order.id,shop,`gid://shopify/Order/${i}`,`gid://shopify/OrderTransaction/${i}`]
    const capture = `gid://shopify/OrderTransaction/${100+i}`
    const confirm = () => scalar('select confirm_initiation_shopify_capture($1,$2,$3,$4,$5,$6,$7)',
      [...binding,capture,'2026-11-17T00:00:00Z',address])
    await assert.rejects(confirm,/approved authorization/)
    if (i === 3) {
      await db.query("update initiation_orders set expires_at=now()-interval '1 minute' where id=$1",[order.id])
      assert.equal(await scalar('select expire_unbound_initiation_shopify_checkouts()'),1)
      await assert.rejects(() => bind(binding),/cannot be captured/)
      continue
    }
    assert.equal(await bind(binding),true)
    assert.equal(await bind(binding),false)
    await assert.rejects(() => bind([order.id,shop,'gid://shopify/Order/999','gid://shopify/OrderTransaction/999']),/different authorization/)
    assert.equal(await confirm(),order.id)
    assert.equal(await confirm(),order.id)
    assert.equal(await scalar('select count(*)::int from initiation_shipments where order_id=$1',[order.id]),count)
    assert.equal(await scalar('select count(*)::int from initiation_entitlements where order_id=$1',[order.id]),kind==='standard'?1:0)
    assert.equal(await scalar('select role::text from voyager_profiles where id=$1',[user]),'voyager')
    assert.equal(await scalar('select eligible_initial_initiation_order($1)',[user]),kind==='initial'?order.id:null)

    const sync = () => scalar('select sync_initiation_shopify_checkout_packs($1,$2,$3,$4)', [order.id,capture,'2026-11-17T01:00:00Z',
      { 1: { status:'preparing', trackingUrl:'https://example.com/first', trackingNumber:'TEST-1' } }])
    assert.equal(await sync(),1)
    assert.equal(await sync(),0)
    assert.deepEqual(await scalar('select jsonb_agg(tracking_number order by position) from initiation_shipments where order_id=$1',[order.id]),
      ['TEST-1',...Array(count-1).fill(null)])
  }
  await db.exec('begin')
  const lastBuyer = '81200000-0000-4000-8000-000000000007'
  await db.query("insert into voyager_profiles(id,role,account_kind) values($1,'applicant','human')", [lastBuyer])
  await db.exec(`
    with peers as (
      insert into voyager_profiles(id,role,account_kind)
      select gen_random_uuid(),'applicant','human' from generate_series(1,99-initiation_occupied_seats())
      returning id
    )
    insert into initiation_orders(user_id,amount,price_id,product_id,order_kind,pricing_version,stripe_livemode)
    select id,3800,'price_stripe','prod_stripe','initial','voyager-bundles-v1',true from peers
  `)
  const lastInitial = await reserve(lastBuyer, 'initial')
  assert.equal(Number(await scalar('select initiation_occupied_seats()')), 100)
  const lastComplete = await reserve(lastBuyer, 'standard')
  await db.query("update initiation_orders set expires_at=now()-interval '1 minute' where id=$1", [lastInitial.id])
  assert.notEqual((await reserve(lastBuyer, 'initial')).id, lastInitial.id)
  assert.equal((await reserve(lastBuyer, 'standard')).id, lastComplete.id)
  assert.equal(Number(await scalar('select initiation_occupied_seats()')), 100)
  await db.exec('rollback')
  for (const [i, first, second] of [[5,'initial','standard'],[6,'standard','initial']]) {
    const user = `81200000-0000-4000-8000-00000000000${i}`
    await db.query("insert into voyager_profiles(id,role,account_kind) values($1,'applicant','human')",[user])
    const occupied = Number(await scalar('select initiation_occupied_seats()'))
    const original = await reserve(user, first)
    const alternate = await reserve(user, second)
    assert.notEqual(original.id, alternate.id)
    assert.equal((await reserve(user, first)).id, original.id)
    assert.equal((await reserve(user, second)).id, alternate.id)
    assert.equal(original.amount, first === 'initial' ? 3800 : 48800)
    assert.equal(alternate.amount, second === 'initial' ? 3800 : 48800)
    assert.equal(Number(await scalar('select initiation_occupied_seats()')), occupied + 1)
    await assert.rejects(() => scalar("select reserve_initiation_v2($1,'price_stripe','prod_stripe','standard',null)", [user]), /existing checkout/i)

    const winner = [alternate.id,shop,`gid://shopify/Order/${i}1`,`gid://shopify/OrderTransaction/${i}1`]
    const loser = [original.id,shop,`gid://shopify/Order/${i}2`,`gid://shopify/OrderTransaction/${i}2`]
    assert.equal(await bind(winner), true)
    await assert.rejects(() => bind(loser), /cannot be captured/)
    assert.equal(await scalar('select superseded_by from initiation_shopify_checkouts where order_id=$1', [original.id]), alternate.id)
    assert.equal(await scalar('select status from initiation_orders where id=$1', [original.id]), 'canceled')
    await assert.rejects(() => reserve(user, first), /existing payment/)
    const settle = binding => scalar('select confirm_initiation_shopify_capture($1,$2,$3,$4,$5,$6,$7)',
      [...binding,`gid://shopify/OrderTransaction/${i}9`,'2026-11-17T00:00:00Z',address])
    await assert.rejects(() => settle(loser), /approved authorization/)
    assert.equal(await settle(winner), alternate.id)
    assert.equal(await scalar('select count(*)::int from initiation_shipments where user_id=$1', [user]), second === 'initial' ? 2 : 4)
    await assert.rejects(() => reserve(user, first), /not eligible/)
  }
  assert.equal(await scalar("select has_table_privilege('authenticated','public.initiation_shopify_events','select')"),false)
  assert.equal(await scalar("select has_function_privilege('authenticated','public.reserve_initiation_shopify_v2(uuid,text,text,text,text,text)','execute')"),false)
  console.log('Passed v122/v123: both bundle orders, one seat, one capture, Stripe coexistence, expiry, member activation, Console unlock and Pack replay')
} finally {
  await db.close()
}
