// Real checkout/reconciliation modules, in-memory adapters only. No env or I/O.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import ts from 'typescript'
const root=path.resolve(import.meta.dirname,'../..')
const env={ NEXT_PUBLIC_SITE_URL:'https://fixture.example.test', INITIATION_BUNDLES_ENABLED:'true',
 STRIPE_INITIATION_PRICE_ID:'price_520', STRIPE_INITIATION_UPGRADE_PRICE_ID:'price_400',
 STRIPE_INITIATION_INITIAL_PRICE_ID:'price_48', STRIPE_INITIATION_INITIAL_UPGRADE_PRICE_ID:'price_500',
 STRIPE_INITIATION_PRODUCT_ID:'prod_init', INITIATION_SHIPPING_COUNTRIES:'US', INITIATION_TERMS_URL:'https://fixture.example.test/terms/initiation' }
let kind,amount,legacy,initial,order,session,intent,calls
function setup(k,a){
 kind=k;amount=a;legacy=k==='legacy_upgrade'?'legacy-id':null;initial=k==='initial_upgrade'?'initial-id':null;calls=[]
 const price={standard:'price_520',legacy_upgrade:'price_400',initial:'price_48',initial_upgrade:'price_500'}[k]
 order={id:'order-id',user_id:'buyer',order_kind:k,amount:a,currency:'usd',price_id:price,product_id:'prod_init',stripe_livemode:false,
 status:'pending',stripe_session_id:null,stripe_payment_intent:null,initial_order_id:initial,legacy_order_id:legacy,expires_at:new Date(Date.now()+3600000).toISOString(),analytics_context:{},meta_attribution:{}}
 session={id:'cs_test_fixture',mode:'payment',status:'open',payment_status:'unpaid',livemode:false,amount_total:a,currency:'usd',url:'https://checkout.stripe.com/test',payment_intent:'pi_fixture',
 metadata:{product_type:'voyager_initiation',order_kind:k,order_id:order.id,user_id:'buyer'},collected_information:{shipping_details:{name:'Fixture',address:{line1:'1 Test',country:'US',state:'CA'}}}}
 intent={id:'pi_fixture',status:'requires_capture',capture_method:'manual',livemode:false,amount:a,amount_capturable:a,amount_received:0,currency:'usd',metadata:{...session.metadata}}
}
const admin={
 from(table){let patch,single=false,filters=[];const q={select(){return q},single(){single=true;return q},maybeSingle(){single=true;return q},
 update(value){patch=value;return q},eq(k,v){filters.push([k,v]);return q},is(k,v){return q.eq(k,v)},in(k,v){filters.push([k,v]);return q},
 then(resolve){let data
 if(patch){calls.push({update:table,patch});if(filters.every(([k,v])=>Array.isArray(v)?v.includes(order[k]):typeof v==='object'||order[k]===v))Object.assign(order,patch);data=[{id:order.id}]}
 else data=table==='initiation_batches'?{stripe_livemode:false}:table==='voyager_profiles'?{role:'applicant'}:single?{...order}:[]
 return Promise.resolve({data,error:null}).then(resolve)}};return q},
 async rpc(name,args){calls.push({rpc:name,args});if(name==='complete_initiation'){order.status='paid';order.stripe_payment_intent=intent.id}
 return{data:name==='eligible_legacy_initiation_order'?legacy:name==='eligible_initial_initiation_order'?initial:name==='reserve_initiation'?{...order}:null,error:null}}
}
const stripe={prices:{retrieve:async()=>({active:true,type:'one_time',unit_amount:amount,currency:'usd',product:'prod_init',tax_behavior:'inclusive',livemode:false})},
 checkout:{sessions:{create:async(params,options)=>{calls.push({create:params,options});return{...session}},retrieve:async()=>({...session}),listLineItems:async()=>({has_more:false,data:[{price:{id:order.price_id,product:'prod_init'},quantity:1}]})}},
 paymentIntents:{retrieve:async()=>({...intent}),capture:async()=>{calls.push({capture:true});intent.status='succeeded';intent.amount_received=amount;intent.amount_capturable=0;session.payment_status='paid'},
 cancel:async()=>{calls.push({cancel:true});intent.status='canceled';return intent}}}
const stubs={
 'server-only':{},'next/server':{NextResponse:{json:(body,init)=>({body,status:init?.status??200})}},'next/headers':{cookies:async()=>({get:()=>undefined})},
 '@/lib/supabase/server':{createAdminClient:()=>admin,createClient:async()=>({auth:{getUser:async()=>({data:{user:{id:'buyer',email:'fixture@example.test'}}})}})},
 '@/lib/stripe':{getStripe:()=>stripe},'@/lib/initiation-config':{initiationConfigurationError:()=>null},
 '@/lib/initiation-meta-attribution':{captureInitiationMetaAttribution:()=>({})},
 '@/lib/initiation-meta-purchases':{sendPendingInitiationMetaPurchases:async()=>{calls.push({meta:true})}},
}
const allowed=new Set(['src/app/api/initiation-checkout/route.ts','src/lib/initiation-types.ts','src/lib/initiation-offers.ts','src/app/voyager-initiation/navigation.ts',
 'src/lib/initiation-checkout-policy.ts','src/lib/initiation-reconciliation.ts','src/lib/initiation-capture-policy.ts','src/lib/initiation-payment.ts'])
function load(file){if(!allowed.has(file))throw new Error(`Unapproved offline dependency: ${file}`)
 const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
 const result={exports:{}};const require=name=>{if(name in stubs)return stubs[name];return load(name.startsWith('@/')?`src/${name.slice(2)}.ts`:path.relative(root,path.resolve(root,path.dirname(file),`${name}.ts`)))}
 vm.runInNewContext(code,{exports:result.exports,require,process:{env},URL,Date,console:{warn(){},error(){}}},{filename:file});return result.exports
}
// Tracking transport is isolated; separate unit tests verify real outbox binding.
stubs['@/lib/initiation-analytics']={sanitizeInitiationAnalytics:()=>({})}
stubs['@/lib/initiation-analytics-outbox']={validInitiationAnalyticsSession:(o,s)=>o.order_kind===s.metadata.order_kind&&o.amount===s.amount_total&&o.stripe_session_id===s.id,
 queueInitiationCheckoutAnalytics:async()=>calls.push({checkoutEvent:true}),sendPendingInitiationAnalytics:async()=>calls.push({analytics:true})}
const {POST}=load('src/app/api/initiation-checkout/route.ts')
const {reconcileInitiationSession}=load('src/lib/initiation-reconciliation.ts')
const request=bundle=>({headers:{get:()=>env.NEXT_PUBLIC_SITE_URL},json:async()=>({...(bundle?{bundle}:{}),amount:1,kind:'legacy_upgrade',user_id:'attacker'})})
for(const [k,a,bundle] of [['standard',52000,undefined],['legacy_upgrade',40000,undefined],['initial',4800,'initial'],['initial_upgrade',50000,'complete']]){
 setup(k,a)
 assert.equal((await POST(request(bundle))).status,200)
 const created=calls.find(c=>c.create)
 assert.equal(created.create.line_items[0].price,order.price_id)
 assert.equal(created.create.metadata.order_kind,k)
 assert.equal(created.create.client_reference_id,'buyer')
 assert.equal(created.create.payment_intent_data.capture_method,'manual')
 assert.equal(created.options.idempotencyKey,'initiation:order-id')
 assert.equal((await POST(request(bundle))).status,200)
 assert(calls.some(c=>c.checkoutEvent))
 assert.equal(calls.filter(c=>c.create).length,1)
 session.status='complete'
 assert.equal(await reconcileInitiationSession(session.id,stripe),'paid')
 assert(calls.some(c=>c.capture))
 assert(calls.some(c=>c.rpc==='complete_initiation'))
 assert(calls.some(c=>c.meta)&&calls.some(c=>c.analytics))
}
setup('standard',52000);assert.equal((await POST(request('initial_upgrade'))).status,409)
assert(!calls.some(c=>c.create))
setup('legacy_upgrade',40000);assert.equal((await POST(request('initial'))).status,409)
setup('initial_upgrade',50000);await POST(request('complete'));session.status='complete';initial=null
assert.equal(await reconcileInitiationSession(session.id,stripe),'released')
assert(calls.some(c=>c.cancel));assert(!calls.some(c=>c.capture||c.rpc==='complete_initiation'))
setup('standard',52000);env.INITIATION_BUNDLES_ENABLED='false'
assert.equal((await POST(request())).status,200)
setup('standard',52000);assert.equal((await POST(request('initial'))).status,409)
console.log('Four real checkout branches + capture/reconciliation passed offline: 520, legacy 400, Initial 48, upgrade 500; forged tiers rejected, revoked eligibility cancels authorization.')
