// Disposable in-memory PostgreSQL only. Explicit module path; no env or network.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
try {
 const harness = await fs.readFile(new URL('./initiation-v90.mjs',import.meta.url),'utf8')
 const blocks = [...harness.matchAll(/await db\.exec\(`([\s\S]*?)`\)/g)].slice(0,2)
 assert.equal(blocks.length,2)
 for(const block of blocks) await db.exec(block[1])
 for(const name of ['83_initiation','85_initiation_roster','90','87_npc_initiation','88','89','91','94']) await db.exec(await fs.readFile(new URL(`../schema_v${name}.sql`,import.meta.url),'utf8'))
 await db.exec("alter table device_batches add column device_status text not null default 'searching'")
 const apply = name => fs.readFile(new URL(`../schema_v${name}.sql`,import.meta.url),'utf8').then(sql => db.exec(sql))
 const rows = async (sql, params=[]) => (await db.query(sql,params)).rows
 const scalar = async (sql, params=[]) => Object.values((await rows(sql,params))[0])[0]
 const uid = n => `14000000-0000-0000-0000-${String(n).padStart(12,'0')}`
 const shipping={name:'Isolated Fixture',address:{line1:'1 Fixture',country:'US',state:'CA'}}
 const member = async n => {
  await rows("insert into voyager_profiles(id,role,account_kind) values($1,'applicant','human')",[uid(n)])
  await rows("insert into voyager_intake values($1,'voyager-profile-v1')",[uid(n)])
  const order = await scalar("select reserve_initiation($1,'price_520','prod_init','standard',null)",[uid(n)])
  await rows('select complete_initiation($1,$2,$3,$4,$5)',[order.id,`cs_fixture_${n}`,uid(n),`pi_${n}`,shipping])
 }
 const batch = async (slug,code,status,units=2) => {
  await rows("insert into device_batches(slug,code,publication_status,listing_quantity,device_status) values($1,$2,'published',$3,$4)",[slug,code,units,status])
  for(let i=1;i<=units;i++) await rows("insert into device_batch_units(batch_slug,sequence_no,unit_code,status) values($1,$2,$3,'available')",[slug,i,`${code}-00${i}`])
 }
 await db.exec('update initiation_batches set checkout_open=true')
 for(const n of [1,2,3]) await member(n)
 await batch('kamakura','KA','searching'); await batch('legacy','LG','survey'); await batch('kyoto','KY','claiming'); await batch('delivering','DL','pack_one'); await batch('old-open','OO','claim_open')
 await batch('old-active','OA','active')

 // v91 has the gap this migration closes.
 await db.exec('begin')
 assert.equal((await scalar("select claim_initiation_console($1,'kamakura')",[uid(1)])).unitCode,'KA-001')
 await db.exec('rollback')

 await apply('114')
 for(const slug of ['kamakura','legacy']) await assert.rejects(()=>rows('select claim_initiation_console($1,$2)',[uid(1),slug]),e=>e.code==='P1003'&&/search is still in progress/.test(e.message))
 assert.equal(await scalar('select console_order_id from initiation_entitlements where user_id=$1',[uid(1)]),null)
 assert.equal(await scalar("select claimed_quantity from device_batches where slug='kamakura'"),0)
 assert.equal(await scalar("select count(*)::int from device_batch_units where batch_slug='kamakura' and status='available'"),2)

 for(const [slug,unit] of [['delivering','DL-001'],['old-open','OO-001'],['old-active','OA-001']]) {
  await db.exec('begin')
  assert.equal((await scalar('select claim_initiation_console($1,$2)',[uid(1),slug])).unitCode,unit)
  await db.exec('rollback')
 }
 const claim = await scalar("select claim_initiation_console($1,'kyoto')",[uid(1)])
 assert.equal(claim.unitCode,'KY-001')
 // A batch moved back to Search keeps its existing claim.
 await rows("update device_batches set device_status='searching' where slug='kyoto'")
 const again = await scalar("select claim_initiation_console($1,'kyoto')",[uid(1)])
 assert.equal(again.orderId,claim.orderId); assert.equal(again.already,true)
 await assert.rejects(()=>rows("select claim_initiation_console($1,'kyoto')",[uid(2)]),/search is still in progress/)
 await db.exec('set role authenticated')
 await assert.rejects(()=>rows("select claim_initiation_console($1,'delivering')",[uid(3)]),/permission denied/)
 await db.exec('reset role')
 assert.equal(await scalar("select has_function_privilege('service_role','claim_initiation_console(uuid,text)','execute')"),true)

 await apply('114.rollback')
 assert.equal((await scalar("select claim_initiation_console($1,'kamakura')",[uid(2)])).unitCode,'KA-001')
 console.log('PASS: v114 blocks new claims in Search and legacy Survey, keeps existing claims and later stages open, rollback restores v91')
} finally { await db.close() }
