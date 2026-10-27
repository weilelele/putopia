// Explicit isolated QA only. No payments, real emails, or production services.
import fs from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
const [envFile,stateFile,resultFile] = process.argv.slice(2)
assert.ok(envFile && stateFile && resultFile, 'Pass the dedicated QA env, private fixture state, and result file')
const env=parseEnv(await fs.readFile(envFile,'utf8'))
assert.equal(new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname,'gqcgdmmmmfbatdneacny.supabase.co')
assert.match(env.STRIPE_SECRET_KEY,/^(sk|rk|rkcs)_test_/)
const origin='https://putopia-stripe-meta-qa.vercel.app'
assert.equal(new URL(env.NEXT_PUBLIC_SITE_URL).origin,origin)
const stripe=new Stripe(env.STRIPE_SECRET_KEY)
assert.equal((await stripe.accounts.retrieve()).id,'acct_1UTxRiAPEEV0NYJ8')
const hooks=await stripe.webhookEndpoints.list({limit:100})
assert.equal(hooks.has_more,false)
assert.ok(hooks.data.every(x=>!x.livemode && x.status==='disabled'))
const state=JSON.parse(await fs.readFile(stateFile,'utf8'))
assert.match(state.email,/^latency-[0-9a-f-]+@example\.com$/)
const admin=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const jar=new Map()
const auth=createServerClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{
  getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>jar.set(name,value)),
}})
const login=await auth.auth.signInWithPassword({email:state.email,password:state.password})
if(login.error)throw login.error
assert.equal(login.data.user.id,state.userId)
const cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ')
const results=[]
const post=(body,options={})=>fetch(`${origin}/api/initiation-checkout`,{method:'POST',headers:{Origin:options.origin??origin,'Content-Type':'application/json',...(options.guest?{}:{Cookie:cookie})},body:JSON.stringify(body)})
assert.equal((await post({bundle:'initial'},{guest:true})).status,401)
results.push({check:'guest cannot use authenticated checkout',pass:true})
assert.equal((await post({bundle:'initial'},{origin:'https://wrong-origin.example'})).status,403)
results.push({check:'origin validation',pass:true})
assert.equal((await post({bundle:'cheap'})).status,400)
results.push({check:'invalid bundle rejected',pass:true})
const response=await post({bundle:'initial',user_id:randomUUID(),amount:1,afterSignIn:true,analytics:{is_internal_qa:true,disabled:true}})
assert.equal(response.status,200)
const data=await response.json()
const url=new URL(data.url)
assert.equal(url.origin,'https://checkout.stripe.com')
const session=await stripe.checkout.sessions.retrieve(url.pathname.split('/').pop())
assert.equal(session.metadata.user_id,state.userId)
assert.equal(session.amount_total,3800)
assert.equal(session.currency,'usd')
assert.equal(session.livemode,false)
assert.equal(session.payment_status,'unpaid')
assert.equal(session.payment_intent,null)
results.push({check:'forged owner/amount ignored; afterSignIn still validates and prices server-side',pass:true,sessionId:session.id})
const lookup=await admin.rpc('find_activation_account',{p_email:state.email.toUpperCase()})
if(lookup.error)throw lookup.error
assert.deepEqual(lookup.data,[{id:state.userId,activated:true}])
const absent=await admin.rpc('find_activation_account',{p_email:`absent-${randomUUID()}@example.com`})
if(absent.error)throw absent.error
assert.deepEqual(absent.data,[])
results.push({check:'bounded Auth lookup found and missing account',pass:true})
const guest=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
for(const [label,client] of [['anon',guest],['authenticated',auth]]) {
  assert.equal((await client.rpc('find_activation_account',{p_email:state.email})).error?.code,'42501')
  assert.equal((await client.rpc('save_initiation_checkout_attribution',{p_order:session.metadata.order_id,p_user:state.userId,p_meta:{},p_analytics:{}})).error?.code,'42501')
  results.push({check:`${label} cannot invoke either server-only RPC`,pass:true})
}
const wrongOwner=await admin.rpc('save_initiation_checkout_attribution',{p_order:session.metadata.order_id,p_user:randomUUID(),p_meta:{bad:true},p_analytics:{bad:true}})
assert.ok(wrongOwner.error)
results.push({check:'attribution rejects wrong reservation owner',pass:true})
const batch=await admin.from('initiation_batches').select('checkout_open,stripe_livemode').eq('label','S26').single()
if(batch.error)throw batch.error
assert.deepEqual(batch.data,{checkout_open:true,stripe_livemode:false})
try {
  const closed=await admin.from('initiation_batches').update({checkout_open:false}).eq('label','S26').eq('stripe_livemode',false)
  if(closed.error)throw closed.error
  assert.equal((await post({bundle:'initial',afterSignIn:true})).status,409)
  results.push({check:'closed batch blocks checkout even with afterSignIn',pass:true})
} finally {
  const restored=await admin.from('initiation_batches').update({checkout_open:true}).eq('label','S26').eq('stripe_livemode',false)
  if(restored.error)throw restored.error
}
await fs.writeFile(resultFile,JSON.stringify({results},null,2))
console.log(JSON.stringify({results}))
