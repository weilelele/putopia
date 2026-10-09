// Creates its own disposable PostgreSQL; never accepts an external DB URL.
// argv[2]: temporary npm prefix containing embedded-postgres and pg.
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const run = promisify(execFile)
const prefix = path.resolve(process.argv[2])
const { default: EmbeddedPostgres } = await import(pathToFileURL(path.join(prefix, 'node_modules/embedded-postgres/dist/index.js')))
const { default: pg } = await import(pathToFileURL(path.join(prefix, 'node_modules/pg/lib/index.js')))
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'putopia-payment-concurrency-'))
const connection = { host: '127.0.0.1', port: 55439, user: 'postgres', password: 'local-fixture-only', database: 'postgres' }
const instance = new EmbeddedPostgres({ databaseDir: path.join(temp, 'db'), ...connection, persistent: false,
  postgresFlags: ['-c', 'listen_addresses=127.0.0.1', '-c', `unix_socket_directories=${temp}`], onLog() {}, onError() {} })
const clients = []
async function connect() { const c = new pg.Client(connection); await c.connect(); clients.push(c); return c }
let started = false
try {
  await instance.initialise(); await instance.start(); started = true
  // Reuse every existing SQL assertion on a real PostgreSQL connection.
  const adapter = path.join(temp, 'adapter.mjs')
  await fs.writeFile(adapter, `import pg from ${JSON.stringify(pathToFileURL(path.join(prefix, 'node_modules/pg/lib/index.js')).href)};
export class PGlite { constructor(){this.client=new pg.Client(${JSON.stringify(connection)});this.ready=this.client.connect()}
async exec(sql){await this.ready;return this.client.query(sql)}
async query(sql,args){await this.ready;return this.client.query(sql,args)}
async close(){await this.client.end()} }`)
  const seed = await run(process.execPath, [path.resolve(import.meta.dirname, '../../supabase/tests/initiation-v90.mjs'), adapter])
  console.log(seed.stdout.trim())
  const control = await connect()
  const uid = n => `10000000-0000-0000-0000-${String(n).padStart(12, '0')}`
  const count = async () => (await control.query('select initiation_occupied_seats()::int n')).rows[0].n
  assert.equal(await count(), 100)
  await control.query("update initiation_orders set status='canceled' where user_id=$1", [uid(101)])
  assert.equal(await count(), 99)
  for (let i = 1000; i < 1020; i++) {
    await control.query("insert into voyager_profiles(id,role,account_kind) values($1,'applicant','human')", [uid(i)])
    await control.query("insert into voyager_intake values($1,'voyager-profile-v1')", [uid(i)])
  }
  const competitors = await Promise.all(Array.from({ length: 20 }, () => connect()))
  const pids = await Promise.all(competitors.map(async c => (await c.query('select pg_backend_pid() pid')).rows[0].pid))
  assert.equal(new Set(pids).size, 20)
  // Hold the batch row first so all callers must contend at the same boundary.
  await control.query('begin')
  await control.query("select * from initiation_batches where label='S26' for update")
  const pending = competitors.map((c, i) => c.query("select reserve_initiation($1,'price_520','prod_init','standard',null) result", [uid(1000 + i)]))
  const outcomesPromise = Promise.allSettled(pending)
  let waiting = 0
  for (let tries = 0; tries < 100 && waiting < 20; tries++) {
    waiting = Number((await control.query("select count(*) n from pg_stat_activity where pid=any($1::int[]) and wait_event_type='Lock'", [pids])).rows[0].n)
    if (waiting < 20) await new Promise(resolve => setTimeout(resolve, 10))
  }
  assert.equal(waiting, 20, 'all 20 independent connections must be blocked on the seat lock')
  await control.query('commit')
  const outcomes = await outcomesPromise
  const winners = outcomes.filter(r => r.status === 'fulfilled')
  assert.equal(winners.length, 1)
  for (const result of outcomes.filter(r => r.status === 'rejected')) assert.match(result.reason.message, /fully reserved/)
  assert.equal(await count(), 100)
  const winner = winners[0].value.rows[0].result
  await control.query("update initiation_orders set expires_at=now()-interval '1 hour' where id=$1", [winner.id])
  assert.equal(await count(), 100, 'clock expiry alone must retain an ambiguous payment hold')
  await control.query("update initiation_orders set status='canceled' where id=$1 and status='pending'", [winner.id])
  assert.equal(await count(), 99)
  console.log('PASS: PostgreSQL 18, 20 distinct backend connections simultaneously blocked on the batch lock; exactly 1 last-seat winner, 19 capacity rejections; occupancy 100; ambiguous expiry held; confirmed cancellation releases to 99.')
} finally {
  await Promise.allSettled(clients.map(c => c.end()))
  if (started) await instance.stop()
  await fs.rm(temp, { recursive: true, force: true })
}
