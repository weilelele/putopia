// Disposable PostgreSQL only. Pass an installed PGlite module; no env or network.
// Exercised as service_role, the role the crons use in production.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
try {
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    grant usage on schema public to anon, authenticated, service_role`)
  await db.exec(await fs.readFile(new URL('../schema_v111.sql', import.meta.url), 'utf8'))
  const row = async () => (await db.query("select consecutive_failures,failing_since is not null as failing,last_error,last_ok_at is not null as ok from ops_cron_health where job='initiation-expiry'")).rows[0]
  await db.exec('set role service_role')
  try {
    await db.query("select record_ops_cron_run('initiation-expiry', null)")
    assert.deepEqual(await row(), { consecutive_failures: 0, failing: false, last_error: null, ok: true })
    await db.query("select record_ops_cron_run('initiation-expiry', 'first')")
    const firstSince = (await db.query("select failing_since from ops_cron_health")).rows[0].failing_since
    await db.query("select record_ops_cron_run('initiation-expiry', 'second')")
    assert.deepEqual(await row(), { consecutive_failures: 2, failing: true, last_error: 'second', ok: true })
    assert.deepEqual((await db.query("select failing_since from ops_cron_health")).rows[0].failing_since, firstSince)
    await db.query("select record_ops_cron_run('initiation-expiry')")
    assert.deepEqual(await row(), { consecutive_failures: 0, failing: false, last_error: null, ok: true })

    await db.query("insert into ops_alerts(alert_key,state) values('initiation-order:x','payment_review')")
    await db.query("insert into ops_alerts(alert_key,state) values('initiation-order:x','pending_checkout_complete') on conflict(alert_key) do update set state=excluded.state,alerted_at=now()")
    assert.equal((await db.query('select state from ops_alerts')).rows[0].state, 'pending_checkout_complete')
  } finally { await db.exec('reset role') }

  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`)
    try {
      await assert.rejects(db.query('select * from ops_alerts'), /permission denied/)
      await assert.rejects(db.query("select record_ops_cron_run('initiation-expiry', null)"), /permission denied/)
    } finally { await db.exec('reset role') }
  }
  console.log('ops-alerts-v111: ok')
} finally { await db.close() }
