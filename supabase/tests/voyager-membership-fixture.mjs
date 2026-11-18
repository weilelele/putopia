import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

/** Recreates only the local database contracts used by the payment flow. */
export async function membershipFixture(modulePath) {
  const { PGlite } = await import(pathToFileURL(modulePath).href)
  const db = new PGlite()
  const harness = await readFile(new URL('./initiation-v90.mjs', import.meta.url), 'utf8')
  for (const block of [...harness.matchAll(/await db\.exec\(`([\s\S]*?)`\)/g)].slice(0, 2)) await db.exec(block[1])
  await db.exec('create table auth.users(id uuid primary key,email text);')
  for (const version of ['83_initiation','85_initiation_roster','90','87_npc_initiation','88','89','91','94','97','102','103','105','107','108','109','116','119','120','122','123','125','126','127']) {
    await db.exec(await readFile(new URL(`../schema_v${version}.sql`, import.meta.url), 'utf8'))
  }
  await db.exec(`create table dreamcatcher_jobs(submitted_by uuid); create table dreamcatcher_rounds(task_id uuid); create table signal_responses(task_id uuid,user_id uuid); create table mission_acceptances(user_id uuid); grant all on dreamcatcher_jobs,signal_responses,mission_acceptances to authenticated;`)
  await db.exec(await readFile(new URL('../schema_v124.sql', import.meta.url), 'utf8'))
  await db.exec("update initiation_batches set checkout_open=true,stripe_livemode=true where label='S26'")
  return db
}
