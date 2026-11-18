// Real route handlers -> server-priced checkout -> signed Shopify evidence -> PostgreSQL.
// Provider, auth, email and analytics transports are fixture-only. All network is denied.
import assert from 'node:assert/strict'
import { createHmac, randomUUID } from 'node:crypto'
import { registerHooks, createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import { membershipFixture } from './voyager-membership-fixture.mjs'
const root = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(new URL('../../package.json', import.meta.url))
const ts = require('typescript')
const db = await membershipFixture(process.argv[2])
const scalar = async (sql, values = []) => Object.values((await db.query(sql, values)).rows[0])[0]
const quote = name => { assert.match(name, /^[a-z_][a-z0-9_]*$/); return `"${name}"` }
const tasks = [], carts = new Map(), remoteOrders = new Map(), confirmations = new Set()
let user = null, sequence = 71000, captures = 0
const shop = 'jtuuus-k3.myshopify.com', origin = 'https://membership-fixture.invalid'
Object.assign(process.env, {
  VERCEL_ENV:'production', INITIATION_MEMBERSHIP_ENABLED:'true', INITIATION_SHOPIFY_LIVE_ENABLED:'true',
  INITIATION_CHECKOUT_ENABLED:'true', INITIATION_TERMS_APPROVED:'true', INITIATION_FULFILLMENT_POLICY_APPROVED:'true',
  INITIATION_SHIPPING_POLICY:'included', INITIATION_TAX_POLICY:'included', INITIATION_SHIPPING_COUNTRIES:'US',
  NEXT_PUBLIC_SITE_URL:origin, INITIATION_TERMS_URL:`${origin}/terms/initiation`,
  SHOPIFY_LIVE_CLIENT_ID:'fixture-client', SHOPIFY_LIVE_CLIENT_SECRET:'fixture-signing-secret',
  SHOPIFY_LIVE_STOREFRONT_PUBLIC_TOKEN:'fixture-only-token',
  SHOPIFY_LIVE_INITIAL_VARIANT_ID:'gid://shopify/ProductVariant/1', SHOPIFY_LIVE_COMPLETE_VARIANT_ID:'gid://shopify/ProductVariant/2',
  SHOPIFY_LIVE_MEMBERSHIP_VARIANT_ID:'gid://shopify/ProductVariant/3', SHOPIFY_LIVE_MEMBERSHIP_INITIAL_VARIANT_ID:'gid://shopify/ProductVariant/4',
  SHOPIFY_LIVE_MEMBERSHIP_COMPLETE_VARIANT_ID:'gid://shopify/ProductVariant/5', SHOPIFY_LIVE_UPGRADE_VARIANT_ID:'gid://shopify/ProductVariant/6',
})
globalThis.fetch = () => { throw new Error('Network is forbidden in this isolated verification') }
class Query {
  constructor(table) { this.table=table; this.filters=[]; this.params=[]; this.fields='*'; this.operation='select' }
  select(fields='*',options={}) { this.fields=fields; this.head=options.head; this.returning=true; return this }
  eq(field,value) { const [name,key]=field.split('->>'); this.params.push(value); this.filters.push(`${quote(name)}${key?`->>'${key}'`:''}=$${this.params.length}`); return this }
  gte(field,value) { this.params.push(value); this.filters.push(`${quote(field)}>=$${this.params.length}`); return this }
  is(field,value) { assert.equal(value,null); this.filters.push(`${quote(field)} is null`); return this }
  in(field,values) { this.params.push(values); this.filters.push(`${quote(field)}=any($${this.params.length})`); return this }
  order(field, options={}) { this.sort=` order by ${quote(field)} ${options.ascending === false?'desc':'asc'}`; return this }
  limit(n) { this.max=` limit ${Number(n)}`; return this }
  update(value) { this.operation='update'; this.value=value; return this }
  delete() { this.operation='delete'; return this }
  upsert(value) { this.operation='upsert'; this.value=value; return this }
  maybeSingle() { this.singleRow=true; return this }
  single() { this.singleRow=true; return this }
  then(resolve,reject) { return this.execute().then(resolve,reject) }
  async execute() {
    const where=this.filters.length?` where ${this.filters.join(' and ')}`:''
    let sql
    if(this.operation==='select') sql=`select ${this.fields==='*'?'*':this.fields.split(',').map(quote).join(',')} from ${quote(this.table)}${where}${this.sort??''}${this.max??''}`
    else if(this.operation==='delete') sql=`delete from ${quote(this.table)}${where} returning *`
    else if(this.operation==='update') {
      const set=Object.entries(this.value).map(([key,value])=>{this.params.push(value);return `${quote(key)}=$${this.params.length}`}).join(',')
      sql=`update ${quote(this.table)} set ${set}${where} returning *`
    } else {
      const entries=Object.entries(this.value)
      this.params=entries.map(([,value])=>value)
      sql=`insert into ${quote(this.table)}(${entries.map(([key])=>quote(key)).join(',')}) values(${entries.map((_,i)=>`$${i+1}`).join(',')}) on conflict(shop,order_gid) do update set event_id=excluded.event_id,received_at=excluded.received_at returning *`
    }
    try { const result=await db.query(sql,this.params); return { data:this.head?null:this.singleRow?result.rows[0]??null:result.rows, count:result.rows.length, error:null } }
    catch(error) { console.error(error.message); return {data:null,error} }
  }
}
const admin={from:table=>new Query(table),rpc:async(name,args={})=>{
  try { const entries=Object.entries(args); return { data:await scalar(`select ${quote(name)}(${entries.map(([key],i)=>`${quote(key)}=>$${i+1}`).join(',')})`,entries.map(([,value])=>value)),error:null } }
  catch(error) { console.error(error.message); return {data:null,error} }
}}
const money = amount => ({shopMoney:{amount:String(amount),currencyCode:'USD'},presentmentMoney:{amount:String(amount),currencyCode:'USD'}})
const tx = (id,kind,amount,parent=null) => ({id:`gid://shopify/OrderTransaction/${id}`,kind,status:'SUCCESS',test:false,gateway:'shopify_payments',amountSet:money(amount),processedAt:new Date().toISOString(),parentTransaction:parent?{id:parent}:null})
const connection = nodes => ({nodes,pageInfo:{hasNextPage:false}})
async function provider(url, _headers, payload) {
  assert.ok(url.startsWith(`https://${shop}/`))
  if(url.endsWith('/admin/oauth/access_token')) return {access_token:'fixture-admin-token'}
  const {query,variables}=JSON.parse(payload)
  if(query.includes('cartCreate')) {
    const id=variables.input.attributes[0].value.split('.')[0]
    const saved=await scalar('select to_jsonb(o) from initiation_orders o where id=$1',[id])
    const variant=variables.input.lines[0].merchandiseId
    const expected= saved.order_kind==='membership'?3:saved.order_kind==='legacy_upgrade'?6:saved.membership_order_id?saved.order_kind==='initial'?4:5:saved.order_kind==='initial'?1:2
    assert.equal(variant,`gid://shopify/ProductVariant/${expected}`)
    assert.equal(variables.input.buyerIdentity.countryCode,saved.order_kind==='membership'?undefined:'US')
    const url=`https://${shop}/cart/c/fixture-${id}?key=fixture-key`
    carts.set(id,{saved,input:variables.input,variant})
    return {data:{cartCreate:{cart:{checkoutUrl:url,cost:{subtotalAmount:{currencyCode:'USD',amount:(saved.amount/100).toFixed(2)}}},userErrors:[]}}}
  }
  if(query.includes('orderCapture')) {
    const remote=remoteOrders.get(variables.input.id)
    assert.equal(variables.input.parentTransactionId,remote.transactions[0].id)
    assert.equal(variables.input.amount,Number(remote.totalPriceSet.shopMoney.amount).toFixed(2))
    assert.equal(variables.input.currency,'USD')
    captures++
    remote.transactions.push(tx(++sequence,'CAPTURE',remote.totalPriceSet.shopMoney.amount,remote.transactions[0].id))
    remote.displayFinancialStatus='PAID'
    return {data:{orderCapture:{transaction:{status:'SUCCESS'},userErrors:[]}}}
  }
  assert.ok(query.includes('ShopifyPilotOrder'))
  return {data:{order:remoteOrders.get(variables.id)}}
}
globalThis.__membershipFixture={admin,tasks,provider,confirmations,getUser:()=>user,findAccount:async email=>(await db.query('select id,registered_at is not null as activated from voyager_profiles where email=$1',[email])).rows[0]??null,createAccount:async email=>{const id=randomUUID();await db.query("insert into voyager_profiles(id,email,role,account_kind) values($1,$2,'applicant','human')",[id,email]);return {id,created:true}}}
const stub = source => `data:text/javascript,${encodeURIComponent(source)}`
const fixture='globalThis.__membershipFixture'
registerHooks({
  resolve(specifier,context,next) {
    let filename=specifier.startsWith('@/')?path.join(root,'src',specifier.slice(2)):specifier.startsWith('.')?path.resolve(path.dirname(fileURLToPath(context.parentURL)),specifier):null
    if(filename&&!path.extname(filename)) filename+='.ts'
    const mocks={
      'server-only':'export {}',
      'next/headers':'export async function cookies(){return {get:()=>undefined}}',
      'next/server':`export class NextResponse extends Response {static json(data,options){return new Response(JSON.stringify(data),{...options,headers:{'content-type':'application/json'}})}}; export function after(task){${fixture}.tasks.push(task)}`,
    }
    let source=mocks[specifier]
    if(filename?.endsWith('/lib/supabase/server.ts')) source=`export const createAdminClient=()=>${fixture}.admin;export const createClient=async()=>({auth:{getUser:async()=>({data:{user:${fixture}.getUser()},error:null})}})`
    if(filename?.endsWith('/lib/shopify-bundle-pilot.ts')) source=`export const shopifyApiVersion='2026-10';export const shopifyPilotRequest=(...args)=>${fixture}.provider(...args)`
    if(filename?.endsWith('/lib/initiation-confirmation.ts')) source=`export async function sendInitiationConfirmation(order,email){if(!email)throw Error('Missing email');${fixture}.confirmations.add(order.id)}`
    if(filename?.endsWith('/lib/initiation-analytics-outbox.ts')) source='export async function sendPendingInitiationAnalytics(){};export async function queueInitiationCheckoutAnalytics(){};export function validInitiationAnalyticsSession(){return false}'
    if(filename?.endsWith('/lib/initiation-meta-purchases.ts')) source='export async function sendPendingInitiationMetaPurchases(){}'
    if(filename?.endsWith('/lib/activation.ts')) source=`export const findAccount=email=>${fixture}.findAccount(email);export const createUnactivatedAccount=email=>${fixture}.createAccount(email);export const sendActivationEmail=async()=>({error:null})`
    if(filename?.endsWith('/lib/stripe.ts')) source="export function getStripe(){throw Error('Stripe must not be called for Membership')}; export const isStripeSecretKey=()=>false"
    if(source!==undefined) return {url:stub(source),shortCircuit:true}
    if(filename&&existsSync(filename)) return {url:pathToFileURL(filename).href,shortCircuit:true}
    return next(specifier,context)
  },
  load(url,context,next) {
    if(url.startsWith(pathToFileURL(root).href)&&url.endsWith('.ts')) return {format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText}
    return next(url,context)
  },
})
try {
  const {POST:checkout}=await import(new URL('../../src/app/api/initiation-checkout/route.ts',import.meta.url))
  const {POST:emailCheckout}=await import(new URL('../../src/app/api/initiation-checkout/email/route.ts',import.meta.url))
  const {POST:webhook}=await import(new URL('../../src/app/api/shopify/webhook/route.ts',import.meta.url))
  const {reconcileShopifyLiveQueue}=await import(new URL('../../src/lib/shopify-live-reconciliation.ts',import.meta.url))
  const {shopifyLiveConfig}=await import(new URL('../../src/lib/shopify-live-config.ts',import.meta.url))
  const {readInitiationSnapshot}=await import(new URL('../../src/lib/initiation-server.ts',import.meta.url))
  const config=shopifyLiveConfig()
  async function person() {
    user={id:randomUUID(),email:'fixture@example.com'}
    await db.query("insert into voyager_profiles(id,role,account_kind) values($1,'applicant','human')",[user.id])
    return user.id
  }
  async function begin(bundle, extra={}) {
    const result=await checkout(new Request(`${origin}/api/initiation-checkout`,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({bundle,amount:1,...extra})}))
    assert.equal(result.status,200,await result.clone().text())
    const {url}=await result.json()
    return carts.get(new URL(url).pathname.split('fixture-')[1])
  }
  async function notify(remote,topic='orders/paid') {
    const body=JSON.stringify(topic==='refunds/create'?{order_id:Number(remote.id.split('/').at(-1))}:{admin_graphql_api_id:remote.id})
    const signature=createHmac('sha256',config.clientSecret).update(body).digest('base64')
    const result=await webhook(new Request(`${origin}/api/shopify/webhook`,{method:'POST',headers:{'x-shopify-topic':topic,'x-shopify-shop-domain':shop,'x-shopify-event-id':randomUUID(),'x-shopify-hmac-sha256':signature},body}))
    assert.equal(result.status,204)
    while(tasks.length) await tasks.shift()()
  }
  async function authorize(cart) {
    const {saved,input,variant}=cart, amount=saved.amount/100, positions=saved.order_kind==='membership'?[]:saved.order_kind==='initial'?[1,2]:saved.order_kind==='legacy_upgrade'?[3,4]:[1,2,3,4]
    const remote={id:`gid://shopify/Order/${++sequence}`,test:false,email:user.email,updatedAt:new Date().toISOString(),cancelledAt:null,displayFinancialStatus:'AUTHORIZED',customAttributes:input.attributes,
      shippingAddress:positions.length?{name:'Fixture Buyer',address1:'1 Test St',address2:null,city:'Santa Clara',provinceCode:'CA',zip:'95054',countryCodeV2:'US'}:null,
      totalPriceSet:money(amount),currentTotalPriceSet:money(amount),totalShippingPriceSet:money(0),totalDiscountsSet:money(0),
      lineItems:connection(positions.length?positions.map(n=>({id:`line-${n}`,sku:n<3?`INITIAL-PACK-${n}`:`COMPLETE-PACK-${n}`,quantity:1,requiresShipping:true,lineItemGroup:{id:'group',quantity:1,variantId:variant}})):[{id:'digital',sku:'VOYAGER-MEMBERSHIP-S26',quantity:1,requiresShipping:false,variant:{id:variant},lineItemGroup:null}]),
      transactions:[tx(++sequence,'AUTHORIZATION',amount)],refunds:[],fulfillments:[]}
    remoteOrders.set(remote.id,remote)
    await notify(remote,'orders/create')
    assert.equal(await scalar('select status from initiation_orders where id=$1',[saved.id]),'pending')
    assert.equal(await reconcileShopifyLiveQueue(config,remote.id),0)
    await notify(remote)
    assert.equal(await scalar('select status from initiation_orders where id=$1',[saved.id]),'paid')
    assert.ok(confirmations.has(saved.id))
    return remote
  }
  async function refund(remote,amount,positions=[]) {
    remote.displayFinancialStatus=amount===Number(remote.totalPriceSet.shopMoney.amount)?'REFUNDED':'PARTIALLY_REFUNDED'
    remote.updatedAt=new Date().toISOString()
    remote.refunds=[{transactions:connection([tx(++sequence,'REFUND',amount,remote.transactions[1].id)]),refundLineItems:connection(positions.map(n=>({quantity:1,lineItem:{id:`line-${n}`}})))}]
    await notify(remote,'refunds/create')
    assert.equal(await scalar('select count(*)::int from initiation_shopify_events'),0)
  }
  assert.equal((await checkout(new Request(`${origin}/api/initiation-checkout`,{method:'POST',headers:{origin:'https://wrong.invalid'}}))).status,403)
  assert.equal((await checkout(new Request(`${origin}/api/initiation-checkout`,{method:'POST',headers:{origin}}))).status,401)
  const uid=await person()
  const baseCart=await begin('membership')
  assert.equal(baseCart.saved.amount,1200)
  assert.equal((await begin('membership')).saved.id,baseCart.saved.id)
  const base=await authorize(baseCart)
  let snapshot=await readInitiationSnapshot(Promise.resolve({data:{user},error:null}))
  assert.equal(snapshot.status,'membership'); assert.equal(snapshot.ownsSeat,true); assert.equal(snapshot.shipments.length,0)
  const initialCart=await begin('initial'); assert.equal(initialCart.saved.amount,2600)
  const initial=await authorize(initialCart)
  const upgradeCart=await begin('standard'); assert.equal(upgradeCart.saved.amount,46000)
  const complete=await authorize(upgradeCart)
  assert.equal(await scalar('select initiation_occupied_seats()'),1)
  assert.equal(await scalar('select count(*)::int from initiation_shipments where user_id=$1',[uid]),4)
  await refund(complete,460,[3,4]); await refund(initial,26,[1,2])
  snapshot=await readInitiationSnapshot(Promise.resolve({data:{user},error:null}))
  assert.equal(snapshot.status,'membership'); assert.equal(snapshot.role,'voyager'); assert.equal(snapshot.consoleClaim.eligible,false)
  await refund(base,12)
  snapshot=await readInitiationSnapshot(Promise.resolve({data:{user},error:null}))
  assert.equal(snapshot.role,'applicant'); assert.equal(snapshot.ownsSeat,false)
  assert.equal(await scalar('select initiation_occupied_seats()'),0)
  await person()
  await authorize(await begin('membership'))
  const direct=await begin('standard'); assert.equal(direct.saved.amount,47600)
  await authorize(direct)
  assert.equal(captures,5)
  // Guest email checkout uses the same server pricing without creating a signed-in session.
  user=null
  const emailRequest=(bundle,upgrade=false)=>emailCheckout(new Request(`${origin}/api/initiation-checkout/email`,{method:'POST',headers:{origin,'content-type':'application/json','x-real-ip':'127.0.0.1'},body:JSON.stringify({email:'guest-fixture@example.com',bundle,upgrade})}))
  const guestStart=await emailRequest('membership')
  assert.equal(guestStart.status,200,await guestStart.clone().text())
  const guestCart=carts.get(new URL((await guestStart.json()).url).pathname.split('fixture-')[1])
  assert.equal(guestCart.saved.amount,1200)
  user={id:guestCart.saved.user_id,email:'guest-fixture@example.com'}
  await authorize(guestCart)
  user=null
  assert.deepEqual(await (await emailRequest('membership')).json(),{next:'already_member'})
  assert.deepEqual(await (await emailRequest('initial')).json(),{next:'membership_upgrade',amount:2600})
  const guestUpgrade=await emailRequest('initial',true)
  assert.equal(guestUpgrade.status,200,await guestUpgrade.clone().text())
  const guestUpgradeCart=carts.get(new URL((await guestUpgrade.json()).url).pathname.split('fixture-')[1])
  assert.equal(guestUpgradeCart.saved.amount,2600)
  assert.equal(user,null)
  console.log('Isolated API verification passed: origin/auth, guest email/activation and upgrade confirmation, $12 checkout, reserved quote against forged amount, retries, signed webhook, authorization/capture, membership snapshot, $26/$476/$460 upgrades, one seat, upgrade refund retention and base refund revocation. No external network, charges or email.')
} finally { await db.close(); delete globalThis.__membershipFixture }
