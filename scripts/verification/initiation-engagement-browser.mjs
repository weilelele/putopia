// Local fixture only: start dev on 127.0.0.1:3013 with NEXT_PUBLIC_POSTHOG_KEY=phc_local_qa.
// Network is intercepted; capture calls observed through dev webpack module cache. No production writes.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright-core')
import { gunzipSync } from 'node:zlib'
import assert from 'node:assert/strict'
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
const events=[]
const context=await browser.newContext({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'})
await context.route('**/*',async route=>{
 const u=new URL(route.request().url()); 
 if (u.pathname.startsWith('/i/v0/e')) {
  try {let b=route.request().postDataBuffer();let data;if(u.searchParams.get('compression')==='gzip-js')data=JSON.parse(gunzipSync(b));else data=JSON.parse(b.toString());events.push(...(Array.isArray(data)?data:[data]));}catch(e){console.log('decode',e.message)}
  return route.fulfill({status:200,body:'{"status":1}'})
 }
 if(u.pathname.includes('/array/'))return route.fulfill({status:200,contentType:'application/json',body:'{}'}); if(u.pathname.startsWith('/static/'))return route.fulfill({status:200,contentType:'text/javascript',body:''}); if(u.pathname.startsWith('/flags'))return route.fulfill({status:200,body:'{"featureFlags":{},"autocapture_opt_out":false}'})
 if(u.hostname!=='127.0.0.1')return route.abort()
 return route.continue()
})
const page=await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', e=>console.log('PAGEERROR',e.message)); console.log('page');await page.goto('http://127.0.0.1:3013/dev/voyager-initiation?state=unpaid&qa=1',{waitUntil:'domcontentloaded'});await page.waitForTimeout(2500); console.log('loaded'); await page.evaluate(()=>{ window.__qaEvents=[]; window.webpackChunk_N_E.push([[987654321],{},r=>{for(const m of Object.values(r.c)){ const p=m.exports?.default; if(p&&typeof p.capture==='function'&&typeof p.init==='function'){ const orig=p.capture.bind(p);p.capture=(event,properties)=>{window.__qaEvents.push({event,properties});return orig(event,properties)};break } }}]) }); 
for(const section of ['pack_1','pack_2','pack_3','pack_4','mission_board','intel','participation','payment','faq']){
 console.log('section',section); await page.locator(`[data-initiation-section="${section}"]`).scrollIntoViewIfNeeded();await page.waitForTimeout(1400)
}
await page.getByRole('button',{name:/Signal Calibration/}).evaluate(e=>e.scrollIntoView({block:'center'})); await page.waitForTimeout(500); await page.getByRole('button',{name:/Signal Calibration/}).click();await page.waitForTimeout(1500);  await page.getByRole('button',{name:'START CALIBRATION →'}).click()
await page.getByRole('button',{name:/To prove the existence/}).click();await page.getByRole('button',{name:'NEXT →'}).click();await page.getByRole('button',{name:'NEXT →'}).click()
await page.getByRole('button',{name:/Officially begin observing/}).click();await page.getByRole('button',{name:'NEXT →'}).click()
await page.locator('#profile-region').selectOption('Illinois');await page.getByRole('button',{name:'NEXT →'}).click()
await page.getByPlaceholder('Your answer').fill('PRIVATE_WORK_SENTINEL');await page.getByRole('button',{name:'NEXT →'}).click()
await page.getByPlaceholder('Your answer').fill('PRIVATE_OBSERVATION_SENTINEL');await page.getByRole('button',{name:'COMPLETE CALIBRATION',exact:true}).click();await page.getByRole('button',{name:'RETURN TO INITIATION →'}).click()
await page.waitForTimeout(12000)
events.push(...await page.evaluate(()=>window.__qaEvents)); const own=events.filter(e=>/^(initiation_|calibration_)/.test(e.event))
console.log(JSON.stringify(own.map(e=>({event:e.event,section:e.properties?.section,question:e.properties?.question_number,depth:e.properties?.depth_percent,ms:e.properties?.active_ms})),null,2))
for(const name of ['initiation_scroll_depth','initiation_section_viewed','initiation_section_dwell','calibration_started','calibration_completed','calibration_exited','calibration_answer_review_shown'])assert(own.some(e=>e.event===name),name)
for(let i=1;i<=5;i++)assert(own.some(e=>e.event==='calibration_question_submitted'&&e.properties.question_number===i),'question '+i)
assert(!JSON.stringify(events).includes('PRIVATE_'),'answer leaked')
await page.screenshot({path:'/private/tmp/initiation-engagement-mobile.png'})
await page.setViewportSize({width:1440,height:1000});await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(2000);await page.evaluate(()=>{ window.__qaEvents=[]; window.webpackChunk_N_E.push([[987654321],{},r=>{for(const m of Object.values(r.c)){ const p=m.exports?.default; if(p&&typeof p.capture==='function'&&typeof p.init==='function'){ const orig=p.capture.bind(p);p.capture=(event,properties)=>{window.__qaEvents.push({event,properties});return orig(event,properties)};break } }}]) });await page.locator('[data-initiation-section="faq"]').scrollIntoViewIfNeeded();await page.waitForTimeout(12000)
events.push(...await page.evaluate(()=>window.__qaEvents)); assert(events.filter(e=>e.event==='initiation_scroll_depth'&&e.properties.depth_percent===100).length>=2,'desktop bottom')
console.log('Browser checks passed: mobile, desktop, all questions, review, privacy, completion')
await browser.close()
