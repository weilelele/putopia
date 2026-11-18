import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { membershipFixture } from './voyager-membership-fixture.mjs'
const db=await membershipFixture(process.argv[2])
const scalar=async(sql,params=[])=>Object.values((await db.query(sql,params)).rows[0])[0]
const shop='jtuuus-k3.myshopify.com'
let sequence=82000
async function person(){const id=randomUUID();await db.query("insert into voyager_profiles(id,role,account_kind) values($1,'applicant','human')",[id]);return id}
const reserve=(user,target='membership')=>scalar('select reserve_initiation_shopify_v3($1,$2,$3,$4,$5,null)',[user,shop,`gid://shopify/ProductVariant/${++sequence}`,'late@example.com',target])
const bind=order=>{const n=++sequence;return scalar('select bind_initiation_shopify_authorization($1,$2,$3,$4)',[order.id,shop,`gid://shopify/Order/${n}`,`gid://shopify/OrderTransaction/${n}`])}
async function expire(order,cancel=true){await db.query("update initiation_orders set expires_at=now()-interval '1 hour' where id=$1",[order.id]);if(cancel)await scalar('select expire_unbound_initiation_shopify_checkouts()')}
async function activate(order){const n=++sequence;const args=[order.id,shop,`gid://shopify/Order/${n}`,`gid://shopify/OrderTransaction/${n}`];assert.equal(await scalar('select bind_initiation_shopify_authorization($1,$2,$3,$4)',args),true);await scalar('select confirm_initiation_shopify_capture($1,$2,$3,$4,$5,now(),null)',[...args,`gid://shopify/OrderTransaction/${n+10000}`]);return args}
try{
 const user=await person(), order=await reserve(user)
 await expire(order)
 assert.equal(await scalar('select status from initiation_orders where id=$1',[order.id]),'canceled')
 assert.equal(await bind(order),true)
 assert.equal(await scalar('select status from initiation_orders where id=$1',[order.id]),'pending')
 assert.equal(await scalar('select expires_at>now() from initiation_orders where id=$1',[order.id]),true)
 const beforeCron=await reserve(await person());await expire(beforeCron,false);assert.equal(await bind(beforeCron),true)
 const changedUser=await person(), stale=await reserve(changedUser);await expire(stale);await reserve(changedUser,'initial')
 await assert.rejects(()=>bind(stale),/Expired Shopify checkout cannot reserve a seat/)
 const closed=await reserve(await person());await expire(closed);await db.exec("update initiation_batches set checkout_open=false where label='S26'")
 await assert.rejects(()=>bind(closed),/Expired Shopify checkout cannot reserve a seat/)
 await db.exec("update initiation_batches set checkout_open=true where label='S26'")
 const member=await person(), base=await reserve(member);await activate(base)
 const upgrade=await reserve(member,'initial');await expire(upgrade)
 const newcomer=await reserve(await person());await expire(newcomer)
 await db.exec(`with people as (insert into voyager_profiles(id,role,account_kind)
  select gen_random_uuid(),'voyager','human' from generate_series(1,100-initiation_occupied_seats()) returning id)
  insert into initiation_members(user_id,batch,source,grant_note) select id,'S26','granted','Isolated capacity fixture' from people`)
 await assert.rejects(()=>bind(newcomer),/Expired Shopify checkout cannot reserve a seat/)
 assert.equal(await bind(upgrade),true,'A valid existing member can upgrade when the batch is full')
 await db.exec('set role authenticated')
 await assert.rejects(()=>bind(order),/permission denied/)
 await db.exec('reset role')
 console.log('v128 passed expired/canceled recovery, current pending checkout protection, closed/full batch refusal, full-batch credited upgrade and client ACL. No external services.')
}finally{await db.close()}
