// Disposable PostgreSQL only. Pass an installed PGlite module; no env or network.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
try {
  const harness = await fs.readFile(new URL('./initiation-v90.mjs', import.meta.url), 'utf8')
  const blocks = [...harness.matchAll(/await db\.exec\(`([\s\S]*?)`\)/g)].slice(0, 2)
  assert.equal(blocks.length, 2)
  for (const block of blocks) await db.exec(block[1])
  for (const name of ['83_initiation', '85_initiation_roster', '90', '87_npc_initiation', '88', '89', '91', '94', '103', '105', '107']) {
    await db.exec(await fs.readFile(new URL(`../schema_v${name}.sql`, import.meta.url), 'utf8'))
  }
  const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0]
  const uid = n => `55000000-0000-0000-0000-${String(n).padStart(12, '0')}`
  const check = (n, snooze = false) => scalar('select claim_voyager_calibration_reminder($1,$2)', [uid(n), snooze])
  for (const n of [1, 2, 3, 4]) await db.query("insert into voyager_profiles(id,role,account_kind) values($1,'applicant','human')", [uid(n)])
  assert.equal((await check(3)).status, 'ineligible')
  assert.equal(await scalar('select count(*)::int from voyager_calibration_reminders'), 0)
  await db.exec('update initiation_batches set checkout_open=true')
  const shipping = { name: 'Reminder Fixture', address: { line1: '1 Fixture', country: 'US', state: 'CA' } }
  for (const n of [1, 2]) {
    const kind = n === 1 ? 'initial' : 'standard'
    const order = await scalar('select reserve_initiation_v2($1,$2,$3,$4,null)', [uid(n), `price_${kind}`, 'prod_fixture', kind])
    await db.query('select complete_initiation($1,$2,$3,$4,$5)', [order.id, `cs_fixture_${n}`, uid(n), `pi_fixture_${n}`, shipping])
  }
  const first = await check(1)
  assert.equal(first.status, 'due')
  assert.equal(first.snapshot.purchaseKind, 'initial')
  assert.equal(first.snapshot.userId, uid(1))
  assert.equal((await check(1)).status, 'cooldown')
  assert.equal((await check(2)).status, 'due')

  // One DO statement gives every operation the identical statement_timestamp,
  // exercising the exact 24h boundary without a clock, sleep or timing tolerance.
  await db.exec(`do $$ begin
    update voyager_calibration_reminders set last_prompted_at=statement_timestamp()-interval '24 hours'+interval '1 millisecond' where user_id='${uid(1)}';
    assert claim_voyager_calibration_reminder('${uid(1)}',false)->>'status'='cooldown','24h minus 1ms must remain quiet';
    update voyager_calibration_reminders set last_prompted_at=statement_timestamp()-interval '24 hours' where user_id='${uid(1)}';
    assert claim_voyager_calibration_reminder('${uid(1)}',false)->>'status'='due','exactly 24h becomes eligible';
    update voyager_calibration_reminders set last_prompted_at=statement_timestamp()-interval '23 hours' where user_id='${uid(1)}';
    assert claim_voyager_calibration_reminder('${uid(1)}',true)->>'status'='deferred','Later restarts cooldown';
    assert (select last_prompted_at=statement_timestamp() from voyager_calibration_reminders where user_id='${uid(1)}'),'Later uses server time';
  end $$;`)
  await db.query("update voyager_calibration_reminders set last_prompted_at=now()-interval '25 hours' where user_id=$1", [uid(1)])
  const simultaneous = await Promise.all([check(1), check(1)])
  assert.deepEqual(simultaneous.map(result => result.status).sort(), ['cooldown', 'due'])

  // Completed calibration permanently wins, even when the reminder is overdue.
  await db.query("insert into voyager_intake values($1,'voyager-profile-v1')", [uid(1)])
  await db.query("update voyager_calibration_reminders set last_prompted_at=now()-interval '365 days' where user_id=$1", [uid(1)])
  assert.equal((await check(1)).status, 'completed')
  assert.equal((await check(1, true)).status, 'completed')
  await db.query('update initiation_members set active=false where user_id=$1', [uid(2)])
  assert.equal((await check(2)).status, 'ineligible')
  await db.query("update voyager_profiles set account_kind='npc' where id=$1", [uid(4)])
  assert.equal((await check(4)).status, 'ineligible')
  // Claiming an anonymous purchase must preserve the stricter account cooldown.
  await db.query("insert into voyager_calibration_reminders values($1,now())", [uid(3)])
  const destinationTime = await scalar('select last_prompted_at from voyager_calibration_reminders where user_id=$1', [uid(3)])
  await db.query('update initiation_members set user_id=$1 where user_id=$2', [uid(3), uid(2)])
  assert.equal(await scalar('select count(*)::int from voyager_calibration_reminders where user_id=$1', [uid(2)]), 0)
  assert.equal(String(await scalar('select last_prompted_at from voyager_calibration_reminders where user_id=$1', [uid(3)])), String(destinationTime))
  for (const role of ['anon', 'authenticated']) {
    assert.equal(await scalar("select has_function_privilege($1,'public.claim_voyager_calibration_reminder(uuid,boolean)','execute')", [role]), false)
    assert.equal(await scalar("select has_table_privilege($1,'public.voyager_calibration_reminders','select')", [role]), false)
    assert.equal(await scalar("select has_table_privilege($1,'public.voyager_calibration_reminders','insert')", [role]), false)
  }
  assert.equal(await scalar("select relrowsecurity from pg_class where oid='public.voyager_calibration_reminders'::regclass"), true)
  assert.equal(await scalar("select has_function_privilege('service_role','public.claim_voyager_calibration_reminder(uuid,boolean)','execute')"), true)
  console.log('v107 passed: first visit, 24h minus 1ms, exact 24h, Later reset, device deduplication, completion, ownership transfer, revoked access and private ACLs')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally { await db.close() }
