// Isolated browser regression: an in-memory HTTP fixture replaces Supabase.
// No production credentials, database, payment, email or external network access.
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright-core')

const apiPort = Number(process.env.FIXTURE_PORT ?? 3027)
const appPort = Number(process.env.APP_PORT ?? 3028)
const api = `http://127.0.0.1:${apiPort}`
const app = `http://127.0.0.1:${appPort}`
const production = process.env.BROWSER_MODE === 'production'
const output = path.resolve(`output/navigation-performance${production ? '-production' : ''}`)
await mkdir(output, { recursive: true })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const alice = '10000000-0000-4000-8000-000000000001'
const bob = '10000000-0000-4000-8000-000000000002'
const intelId = '30000000-0000-4000-8000-000000000001'
const userFor = id => ({ id, aud:'authenticated', role:'authenticated', email:`${id === alice ? 'alice' : 'bob'}@fixture.invalid`, created_at:'2026-10-28T00:00:00Z', app_metadata:{}, user_metadata:{} })
function sessionFor(id) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({sub:id,aud:'authenticated',role:'authenticated',exp})).toString('base64url')}.local-fixture-signature`
  return { access_token:token, refresh_token:`fixture-${id}`, token_type:'bearer', expires_in:3600, expires_at:exp, user:userFor(id) }
}
function actorFor(req) {
  try { return JSON.parse(Buffer.from(String(req.headers.authorization).split('.')[1], 'base64url')).sub ?? null } catch { return null }
}
const profileFor = id => ({ id, role:id === alice ? 'voyager' : 'applicant', account_kind:'human', display_name:id === alice ? 'Alice Fixture' : 'Bob Fixture', avatar_url:null, registered_at:'2026-10-28T00:00:00Z' })
let entries = Array.from({length:45}, (_, index) => ({ id:`20000000-0000-4000-8000-${String(index + 1).padStart(12,'0')}`, author_id:alice, creator_id:alice, parent_id:null, body:`Local fixture post ${index + 1}`, image_path:null, created_at:new Date(Date.UTC(2026,9,28,0,index)).toISOString(), updated_at:new Date(Date.UTC(2026,9,28,0,index)).toISOString(), display_name:'Alice Fixture', avatar_url:null, author_role:'voyager', like_count:0, reply_count:0, liked:false, down_count:0, downvoted:false })).reverse()
const intels = [false,true].map((classified,index) => ({id:index ? '30000000-0000-4000-8000-000000000002' : intelId,title:index ? 'Local Classified Intel' : 'Local Public Intel',content:'A local fixture article for navigation verification.',tag:'ORG',classified,timestamp:'2026-10-28T00:00:00Z',created_at:'2026-10-28T00:00:00Z',images:[],publisher_id:alice,publisher_name:'Alice Fixture'}))
const batches = ['one','two','three'].map((name,index) => {
  const content = {slug:`fixture-${name}`,code:`F${index}`,name:`Fixture ${name}`,location:'Local fixture',timeZone:'UTC',status:'searching',statusLine:'Local fixture only',updatedAt:'2026-10-28',nextMilestone:'Verification',image:'/assets/kyoto-one-20260910/01-warehouse-hero.png',imageAlt:'Device fixture',summary:'Local verification batch.',estimatedCompletion:'Unconfirmed',facts:[],lead:{profileId:alice,name:'Alice Fixture',role:'voyager',initials:'AF',location:'Fixture',bio:'Fixture',latestNote:'Fixture'},holders:[],distributionStages:[],archiveStages:[],latestUpdate:{date:'2026-10-28',title:`Fixture ${name} update`,body:'Fixture update.'}}
  return {content,published_content:content,publication_status:'published',revision:1,listing_quantity:0,claimed_quantity:0,reserved_quantity:0,price_amount:null,price_currency:null}
})
const signalWorld = {id:'40000000-0000-4000-8000-000000000001',name:'Fixture Signal',description:null,discoverer_name:'Alice Fixture',discoverer_id:alice,vote_scope:'all',scan_until:new Date(Date.now() - 3_600_000).toISOString(),lifecycle_state:'syncing'}
const signalThread = {id:'50000000-0000-4000-8000-000000000001',world_id:signalWorld.id,reveal_anchor_at:signalWorld.scan_until,gap_hours:4}
const signalTask = {id:'60000000-0000-4000-8000-000000000001',thread_id:signalThread.id,day_index:0,published_at:signalWorld.scan_until,dreamcatcher_round_id:null}
const requests = []
const state = { failFeed:false, feedDelay:160, commentDelay:1200, eventDelay:1400, databaseDelay:0 }
const fixture = createServer(async (req,res) => {
  const url = new URL(req.url, api)
  const actor = actorFor(req)
  let body = ''
  for await (const chunk of req) body += chunk
  let parsedBody
  try { parsedBody = body ? JSON.parse(body) : null } catch { parsedBody = null }
  const row = {method:req.method,path:url.pathname,query:Object.fromEntries(url.searchParams),actor,body:parsedBody,client:req.headers['x-client-info'] ?? '',started:performance.now(),ended:null}
  requests.push(row)
  const send = (data, status = 200) => {
    row.ended = performance.now()
    res.writeHead(status, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,HEAD,OPTIONS','Content-Range':`0-0/${Array.isArray(data) ? data.length : 1}`})
    res.end(req.method === 'HEAD' ? '' : JSON.stringify(data))
  }
  if (req.method === 'OPTIONS') return send({})
  if (url.pathname.startsWith('/rest/')) await delay(state.databaseDelay)
  if (url.pathname === '/auth/v1/user') { await delay(70); return send(userFor(actor ?? alice)) }
  if (url.pathname === '/auth/v1/logout') return send({}, 200)
  if (url.pathname.startsWith('/rest/v1/rpc/')) {
    const rpc = url.pathname.split('/').at(-1)
    if (rpc === 'effective_access_role') { await delay(100); return send(actor === alice ? 'voyager' : actor ? 'applicant' : 'guest') }
    if (rpc === 'initiation_availability') return send({open:false,capacity:100,initiated:0,remaining:100,paid:0,granted:0})
    if (rpc === 'device_claim_supply') return send({status:'unconfigured'})
    return send(null)
  }
  const table = url.pathname.split('/').at(-1)
  let data = []
  if (table === 'voyager_profiles') {
    await delay(100)
    const id = url.searchParams.get('id')?.replace(/^eq\./,'')
    data = [profileFor(id && !id.startsWith('in.') ? id : actor ?? alice)]
  } else if (table === 'intel') {
    data = intels.filter(item => (!url.searchParams.has('id') || `eq.${item.id}` === url.searchParams.get('id')) && (url.searchParams.get('classified') !== 'eq.false' || !item.classified))
  } else if (table === 'comments') {
    if (url.searchParams.get('select') === 'subject_id') await delay(state.commentDelay)
  } else if (table === 'device_batches') data = batches
  else if (table === 'voyager_feed_view') {
    await delay(state.feedDelay)
    if (state.failFeed) return send({message:'Local simulated failure'},503)
    const parent = url.searchParams.get('parent_id')?.replace(/^eq\./,'')
    data = entries.filter(entry => url.searchParams.has('id') ? `eq.${entry.id}` === url.searchParams.get('id') : entry.parent_id === (parent === 'is.null' ? null : parent ?? null))
    const before = url.searchParams.get('or')?.match(/created_at.lt.([^,)]+)/)?.[1]
    if (before) data = data.filter(entry => entry.created_at < before)
    data = data.slice(0,Number(url.searchParams.get('limit') ?? 100))
    data = data.map(entry => ({...entry, can_manage:entry.creator_id === actor}))
  } else if (table === 'voyager_feed_entries') {
    const id = url.searchParams.get('id')?.replace(/^eq\./,'')
    if (req.method === 'PATCH') entries = entries.map(entry => entry.id === id ? {...entry,...row.body} : entry)
    data = entries.filter(entry => entry.id === id)
    if (req.method === 'DELETE') entries = entries.filter(entry => entry.id !== id && entry.parent_id !== id)
  } else if (table === 'signal_tasks') { await delay(state.eventDelay); data = [signalTask] }
  else if (table === 'signal_threads') data = [signalThread]
  else if (table === 'worlds' && url.searchParams.has('id')) data = [signalWorld]
  if (String(req.headers.accept).includes('application/vnd.pgrst.object+json')) return send(data[0] ?? null)
  return send(data)
})
await new Promise(resolve => fixture.listen(apiPort,'127.0.0.1',resolve))
const nextArgs = production ? ['start'] : ['dev','--webpack']
const next = spawn(process.execPath, ['node_modules/next/dist/bin/next',...nextArgs,'--hostname','127.0.0.1','--port',String(appPort)], {
  cwd:process.cwd(),
  env:{PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:api,NEXT_PUBLIC_SUPABASE_ANON_KEY:'fixture-anon-key',SUPABASE_SERVICE_ROLE_KEY:'fixture-service-key',NEXT_PUBLIC_POSTHOG_KEY:'phc_fixture',NEXT_PUBLIC_POSTHOG_HOST:api,NEXT_PUBLIC_AD_PIXELS_DISABLED:'true'},
  stdio:['ignore','pipe','pipe'],
})
let logs = ''
next.stdout.on('data', chunk => { logs += chunk })
next.stderr.on('data', chunk => { logs += chunk })
let browser
const results = {}
try {
  for (let attempt=0;attempt<90;attempt++) {
    if (logs.includes('Ready in')) break
    if (next.exitCode !== null) throw new Error(`Next exited: ${logs}`)
    await delay(500)
  }
  browser = await chromium.launch({executablePath:process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
  const context = await browser.newContext({viewport:{width:390,height:844}})
  await context.addCookies([{name:'sb-127-auth-token',value:`base64-${Buffer.from(JSON.stringify(sessionFor(alice))).toString('base64url')}`,domain:'127.0.0.1',path:'/'}])
  await context.route('**/*',route => {
    const target = new URL(route.request().url())
    if (target.origin === app || target.origin === api) return route.continue()
    return route.abort()
  })
  const page = await context.newPage()
  page.setDefaultTimeout(20_000)
  const errors = []
  page.on('pageerror',error => errors.push(error.message))
  const count = predicate => requests.filter(predicate).length
  const feedReads = () => count(row => row.path.endsWith('/voyager_feed_view') && row.query.parent_id === 'is.null')
  const intelReads = () => count(row => row.path.endsWith('/intel') && !row.query.id && row.query.select === '*')
  const navigate = async href => {
    const link = page.locator(`nav[aria-label="Primary navigation"] a[href="${href}"]:visible`).first()
    await link.click()
    await page.waitForURL(url => url.pathname === href)
  }
  console.log('Checking Feed pagination and warm navigation')
  await page.goto(`${app}/voyagers`,{waitUntil:'domcontentloaded'})
  await page.getByText('Local fixture post 45',{exact:true}).waitFor()
  await page.addStyleTag({content:'nextjs-portal { display: none !important; }'})
  await page.evaluate(() => { window.__navigationDocument = 'same-document' })
  await page.getByRole('button',{name:'LOAD MORE',exact:true}).click()
  await page.getByText('Local fixture post 6',{exact:true}).waitFor()
  await page.getByRole('button',{name:'LOAD MORE',exact:true}).click()
  await page.getByText('Local fixture post 1',{exact:true}).waitFor()
  assert.equal(feedReads(),3,'exactly one read per requested page')
  const initialReads = feedReads()
  await navigate('/intel')
  await page.getByRole('heading',{name:'Local Public Intel',exact:true}).waitFor()
  const countsInProgress = requests.some(row => row.path.endsWith('/comments') && row.query.select === 'subject_id' && row.ended === null)
  assert(countsInProgress,'Intel must render before comment counts finish')
  await page.getByText('0 comments',{exact:true}).first().waitFor()
  const initialIntelReads = intelReads()
  const warmFeedStart = performance.now()
  await navigate('/voyagers')
  await page.getByText('Local fixture post 1',{exact:true}).waitFor()
  results.warmFeedVisibleMs = Math.round(performance.now() - warmFeedStart)
  await delay(300)
  assert.equal(feedReads(),initialReads,'warm return does not refetch feed pages')
  await navigate('/intel')
  await page.getByRole('heading',{name:'Local Public Intel',exact:true}).waitFor()
  assert.equal(intelReads(),initialIntelReads,'warm return does not refetch Intel')
  await page.getByRole('link',{name:'READ INTEL'}).click()
  await page.getByRole('heading',{name:'Local Public Intel',exact:true}).waitFor()
  await page.locator('a[href="/intel"]:visible').first().click()
  await page.waitForURL(url => url.pathname === '/intel')
  assert.equal(await page.evaluate(() => window.__navigationDocument),'same-document','BackLink must preserve client navigation and memory caches')
  await page.getByRole('heading',{name:'Local Public Intel',exact:true}).waitFor()
  assert.equal(intelReads(),initialIntelReads,'detail return reuses the list')
  await navigate('/voyagers')
  await page.getByText('Local fixture post 1',{exact:true}).waitFor()
  await page.screenshot({path:path.join(output,'feed-mobile.png')})
  console.log('Checking stale revalidation and auth transitions')
  const beforeStale = feedReads()
  await navigate('/intel')
  await page.evaluate(() => { const original = Date.now; window.__fixtureOriginalNow = original; Date.now = () => original() + 31_000 })
  await navigate('/voyagers')
  await page.getByText('Local fixture post 1',{exact:true}).waitFor()
  await delay(900)
  assert.equal(feedReads() - beforeStale,1,'stale return revalidates only the head')
  assert.equal(await page.locator('article').count(),45,'loaded tail stays visible after revalidation')
  results.staleReturnHeadReads = feedReads() - beforeStale
  await page.evaluate(() => { Date.now = window.__fixtureOriginalNow })
  console.log('Checking failed refresh and confirmed tail mutations')
  state.failFeed = true
  await navigate('/intel')
  await page.evaluate(() => { Date.now = () => window.__fixtureOriginalNow() + 62_000 })
  await navigate('/voyagers')
  await page.getByRole('alert').filter({hasText:'The feed could not be loaded.'}).waitFor()
  assert.equal(await page.locator('article').count(),45,'failed background refresh retains visible content')
  state.failFeed = false
  await page.getByRole('button',{name:'Retry',exact:true}).click()
  await page.getByRole('alert').filter({hasText:'The feed could not be loaded.'}).waitFor({state:'hidden'})
  await page.evaluate(() => { Date.now = window.__fixtureOriginalNow })
  const tail = page.locator('article').filter({hasText:'Local fixture post 1'}).filter({has:page.getByText('Local fixture post 1',{exact:true})})
  await tail.getByRole('button',{name:'Options for your post'}).click()
  await page.getByRole('button',{name:'Edit',exact:true}).click()
  await page.getByRole('textbox',{name:'Your content'}).fill('Edited cached tail')
  await page.getByRole('button',{name:'SAVE CHANGES',exact:true}).click()
  await page.getByText('Edited cached tail',{exact:true}).waitFor()
  await page.getByText('Changes saved.',{exact:false}).waitFor()
  await delay(600)
  assert.equal(await page.locator('article').count(),45,'editing a cached tail retains the loaded range')
  await page.locator('article').filter({hasText:'Edited cached tail'}).getByRole('button',{name:'Options for your post'}).click()
  await page.getByRole('button',{name:'Delete',exact:true}).click()
  await page.getByRole('button',{name:'DELETE',exact:true}).click()
  await page.getByText('Content deleted.',{exact:false}).waitFor()
  await delay(600)
  assert.equal(await page.getByText('Edited cached tail',{exact:true}).count(),0,'deleted tail does not reappear after refreshing the head')
  assert.equal(await page.locator('article').count(),44)
  // Discover the real browser SDK in the dev webpack runtime to emit auth
  // changes without a page reload (which would erase the caches under test).
  async function authClient(action,session) {
    return page.evaluate(async ({api,action,session}) => {
      let client
      window.webpackChunk_N_E.push([[Date.now()],{},runtime => {
        for (const loadedModule of Object.values(runtime.c)) {
          if (typeof loadedModule.exports?.createBrowserClient === 'function') { client = loadedModule.exports.createBrowserClient(api,'fixture-anon-key'); break }
        }
      }])
      if (!client) throw new Error('Browser auth SDK not found')
      if (action === 'signout') return client.auth.signOut()
      if (action === 'focus') return client.auth._notifyAllSubscribers('SIGNED_IN',session)
      return client.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token})
    }, {api,action,session})
  }
  const profileReads = () => count(row => row.path.endsWith('/voyager_profiles') && row.client.includes('createBrowserClient'))
  if (!production) {
  const beforeFocus = profileReads()
  await authClient('focus',sessionFor(alice))
  await authClient('focus',sessionFor(alice))
  await delay(250)
  assert.equal(profileReads(),beforeFocus,'repeated SIGNED_IN does not reload the browser profile')
  await navigate('/console')
  await page.locator('section[aria-label="Your membership status"]').getByText('Alice Fixture',{exact:true}).waitFor()
  await navigate('/voyagers')
  await page.getByText('Local fixture post 45',{exact:true}).waitFor()
  await authClient('signin',sessionFor(bob))
  await delay(900)
  assert.equal(await page.getByRole('button',{name:'Options for your post'}).count(),0,'another account cannot reuse management state')
  await navigate('/console')
  await page.locator('section[aria-label="Your membership status"]').getByText('Bob Fixture',{exact:true}).waitFor()
  assert.equal(await page.locator('section[aria-label="Your membership status"]').getByText('Alice Fixture',{exact:true}).count(),0,'account switch must clear cached RSC identity and section state')
  await navigate('/intel')
  await page.getByRole('heading',{name:'Local Public Intel',exact:true}).waitFor()
  assert.equal(await page.getByText('Local Classified Intel',{exact:true}).count(),0,'account switch cannot expose the previous account classified cache')
  await navigate('/voyagers')
  await page.getByText('Local fixture post 45',{exact:true}).waitFor()
  await authClient('signout')
  await page.getByRole('heading',{name:'Join the conversation'}).waitFor()
  assert.equal(await page.locator('article').count(),0,'signout clears private feed content')
  await authClient('signin',sessionFor(alice))
  await page.getByText('Local fixture post 45',{exact:true}).waitFor()
  }
  console.log('Checking lazy Devices and streamed Dashboard')
  await navigate('/devices')
  await page.getByRole('tab',{name:'Fixture one',exact:true}).waitFor()
  const supplies = () => requests.filter(row => row.path.endsWith('/rpc/device_claim_supply')).map(row => row.body.p_slug)
  assert.deepEqual(supplies(),['fixture-one'],'initial device visit loads only its selected batch')
  await page.getByRole('tab',{name:'Fixture two',exact:true}).click()
  await page.getByRole('heading',{name:'Fixture two',exact:true}).waitFor()
  await page.getByRole('tab',{name:'Fixture one',exact:true}).click()
  await page.getByRole('tab',{name:'Fixture one',exact:true,selected:true}).waitFor()
  assert.deepEqual(supplies(),['fixture-one','fixture-two'],'returning to a device room reuses the account snapshot')
  results.deviceSupplyReads = supplies()
  await page.screenshot({path:path.join(output,'devices-mobile.png')})
  state.eventDelay = 4000
  await navigate('/console')
  await page.getByText('WELCOME,',{exact:true}).waitFor()
  await page.getByText('Fixture one update',{exact:true}).waitFor()
  const eventStillLoading = requests.some(row => row.path.endsWith('/signal_tasks') && row.ended === null)
  assert(eventStillLoading,'Dashboard identity and Updates render before slow Events')
  await page.getByRole('heading',{name:'Fixture Signal',exact:true}).waitFor()
  await page.screenshot({path:path.join(output,'dashboard-mobile.png')})
  console.log('Checking authenticated Dashboard full refresh with database latency')
  // Measure this document rather than speculative RSC prefetches for the other
  // four navigation tabs. Normal warm-navigation checks above keep prefetch on.
  await page.route('**/*', route => {
    const headers = route.request().headers()
    if (headers['next-router-prefetch'] || headers['next-router-segment-prefetch'] || headers.purpose === 'prefetch') return route.abort()
    return route.fallback()
  })
  state.eventDelay = 0
  state.databaseDelay = 180
  const initialRequest = requests.length
  const refreshed = []
  for (let attempt=0;attempt<3;attempt++) {
    const started = performance.now()
    await page.reload({waitUntil:'commit'})
    await page.getByText('WELCOME,',{exact:true}).waitFor()
    const identityMs = Math.round(performance.now() - started)
    await page.getByText('Fixture one update',{exact:true}).waitFor()
    const updatesMs = Math.round(performance.now() - started)
    await page.getByRole('heading',{name:'Fixture Signal',exact:true}).waitFor()
    await page.waitForLoadState('load')
    refreshed.push({identityMs,updatesMs,completeMs:Math.round(performance.now() - started)})
  }
  results.dashboardRefresh = {databaseLatencyMs:state.databaseDelay,samples:refreshed}
  const dashboardReads = requests.slice(initialRequest)
  results.dashboardRefresh.databaseReads = dashboardReads.filter(row => row.path.startsWith('/rest/')).length
  if (!process.env.ALLOW_LEGACY_DASHBOARD) {
    assert(!dashboardReads.some(row => row.path.endsWith('/worlds') && row.query.discoverer_id),'Dashboard does not load the personal world library')
    assert(!dashboardReads.some(row => row.path.endsWith('/device_batch_units')),'Dashboard does not load device holders')
    assert(!dashboardReads.some(row => row.path.endsWith('/signal_task_assets')),'warm Dashboard does not load full investigation media')
    const dispatchTasks = dashboardReads.filter(row => row.path.endsWith('/signal_tasks') && row.query.select.includes('dreamcatcher_round_id'))
    assert.equal(dispatchTasks.length,3,'one slim schedule read per full refresh')
    const threads = dashboardReads.filter(row => row.path.endsWith('/signal_threads') && row.query.select.includes('reveal_anchor_at'))
    assert.equal(threads.length,3,'one slim thread read per full refresh')
    for (let i=0;i<3;i++) assert(threads[i].started < dispatchTasks[i].ended,'thread and task queries overlap')
  }
  const entries = []
  for (let attempt=0;attempt<3;attempt++) {
    // Empty browser cache + no client router state; the server remains warm.
    const fresh = await browser.newContext({viewport:{width:390,height:844}})
    await fresh.addCookies([{name:'sb-127-auth-token',value:`base64-${Buffer.from(JSON.stringify(sessionFor(alice))).toString('base64url')}`,domain:'127.0.0.1',path:'/'}])
    await fresh.route('**/*', route => {
      const target = new URL(route.request().url())
      const headers = route.request().headers()
      if (headers['next-router-prefetch'] || headers['next-router-segment-prefetch'] || headers.purpose === 'prefetch') return route.abort()
      return target.origin === app || target.origin === api ? route.continue() : route.abort()
    })
    const entry = await fresh.newPage()
    entry.on('pageerror',error => errors.push(error.message))
    const started = performance.now()
    await entry.goto(`${app}/console`,{waitUntil:'commit'})
    await entry.getByText('WELCOME,',{exact:true}).waitFor()
    const identityMs = Math.round(performance.now() - started)
    await entry.getByText('Fixture one update',{exact:true}).waitFor()
    const updatesMs = Math.round(performance.now() - started)
    await entry.getByRole('heading',{name:'Fixture Signal',exact:true}).waitFor()
    await entry.waitForLoadState('load')
    entries.push({identityMs,updatesMs,completeMs:Math.round(performance.now() - started)})
    await fresh.close()
  }
  results.dashboardFirstBrowserEntry = {serverCache:'warm',databaseLatencyMs:state.databaseDelay,samples:entries}
  state.databaseDelay = 0
  await navigate('/intel')
  await page.getByRole('heading',{name:'Local Public Intel',exact:true}).waitFor()
  await page.screenshot({path:path.join(output,'intel-mobile.png')})
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),'portrait viewport must not overflow')
  await page.setViewportSize({width:1440,height:1000})
  await page.screenshot({path:path.join(output,'intel-desktop.png')})
  assert.equal(errors.length,0,`Browser errors: ${errors.join('; ')}`)
  results.mode = production ? 'production' : 'development'
  results.initialFeedPageReads = initialReads
  results.warmReturnAdditionalFeedReads = 0
  results.warmReturnAdditionalIntelReads = 0
  results.checks = ['45-entry range restoration','warm Feed/Intel navigation','Intel article before counts','Intel detail return without a document reload','stale Feed head-only refresh','failed refresh preserves content','confirmed tail edit/delete',...(!production ? ['repeated auth event deduplication','account switch and logout isolation'] : []),'lazy device batches','streamed Dashboard','three authenticated Dashboard full refreshes with 180ms database latency',...(!process.env.ALLOW_LEGACY_DASHBOARD ? ['no unused Dashboard library/holder/media reads','parallel task/thread reads'] : []),'390x844 portrait and desktop','no browser runtime errors']
  await writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2))
  console.log(JSON.stringify(results,null,2))
} catch (error) {
  await writeFile(path.join(output,'server.log'),logs)
  if (browser) for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({path:path.join(output,'failure.png')}).catch(() => {})
  console.error(JSON.stringify(requests.slice(-12),null,2))
  throw error
} finally {
  await writeFile(path.join(output,'requests.json'),JSON.stringify(requests,null,2))
  await writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2))
  await writeFile(path.join(output,'server.log'),logs)
  await browser?.close()
  next.kill('SIGTERM')
  await new Promise(resolve => fixture.close(resolve))
}
