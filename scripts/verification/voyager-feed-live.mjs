/** Explicit isolated-project integration test. Never reads application .env files. */
import { readFile, writeFile } from 'node:fs/promises'
import { randomUUID, randomBytes } from 'node:crypto'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const configPath = process.argv[2]
if (!configPath) throw new Error('Supply a private JSON config: projectRef, url, anonKey, serviceRoleKey, allowTestWrites:true')
const config = JSON.parse(await readFile(configPath, 'utf8'))
const production = new Set(['oxwfnmcwovxnrvagxzdz', 'dviijahicjciukaosmgg'])
assert.equal(config.allowTestWrites, true, 'Test writes must be explicitly enabled')
assert.match(config.projectRef, /^[a-z]{20}$/)
assert.ok(!production.has(config.projectRef), 'Refusing production project')
assert.equal(config.url, `https://${config.projectRef}.supabase.co`, 'URL must match isolated project')
assert.ok(config.anonKey && config.serviceRoleKey)
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(config.url, config.serviceRoleKey, options)
const anon = createClient(config.url, config.anonKey, options)
const accounts = []
const objects = []
const runId = randomUUID()
const checks = []
const ok = (result, label) => { assert.equal(result.error, null, `${label}: ${result.error?.message}`); checks.push(label); return result.data }
const denied = (result, label) => { assert.ok(result.error || result.data?.length === 0, label); checks.push(label) }
async function account(label, role, registered = true, npc = false) {
  const password = randomBytes(24).toString('base64url')
  const email = `feed-${runId}-${label}@example.invalid`
  const created = ok(await admin.auth.admin.createUser({email,password,email_confirm:true,app_metadata:npc ? {account_kind:'npc'} : {},user_metadata:{display_name:`Feed QA ${label}`}}), `${label}: Auth create`)
  const id = created.user.id
  accounts.push(id)
  const profile = ok(await admin.from('voyager_profiles').update({role,registered_at:registered ? new Date().toISOString() : null}).eq('id',id).select('id,account_kind').single(), `${label}: real profile initialization`)
  assert.equal(profile.account_kind,npc ? 'npc' : 'human')
  const client = createClient(config.url,config.anonKey,options)
  ok(await client.auth.signInWithPassword({email,password}),`${label}: real password sign-in`)
  return {id,client,email,password}
}
const insert = (actor,id,body,extra={}) => actor.client.from('voyager_feed_entries').insert({id,author_id:actor.id,creator_id:actor.id,body,...extra}).select()
try {
  // Missing migrations fail before fixtures are created.
  ok(await admin.from('voyager_feed_view').select('id,can_manage').limit(1),'Migration view exposed to PostgREST')
  const voyager = await account('voyager','voyager')
  const applicant = await account('applicant','applicant')
  const architect = await account('architect','architect')
  const architect2 = await account('architect2','architect')
  const unregistered = await account('unregistered','applicant',false)
  const npc = await account('npc','guest',false,true)
  const post = randomUUID(), reply = randomUUID(), npcPost = randomUUID()
  ok(await insert(voyager,post,'Isolated live integration post'),'Voyager publishes')
  ok(await applicant.client.from('voyager_feed_view').select('*').eq('id',post).single(),'Applicant reads')
  denied(await insert(applicant,randomUUID(),'Denied'),'Applicant cannot publish')
  ok(await insert(applicant,reply,'Applicant reply',{parent_id:post}),'Applicant replies')
  ok(await applicant.client.from('voyager_feed_likes').insert({entry_id:post,user_id:applicant.id}),'Applicant likes')
  const counts = ok(await applicant.client.from('voyager_feed_view').select('like_count,reply_count,liked').eq('id',post).single(),'Counters read')
  assert.equal(Number(counts.like_count),1); assert.equal(Number(counts.reply_count),1); assert.equal(counts.liked,true)
  denied(await applicant.client.from('voyager_feed_entries').update({body:'Hijack'}).eq('id',post).select(),'Non-owner edit denied')
  denied(await architect.client.from('voyager_feed_entries').delete().eq('id',post).select(),'Architect cannot delete others')
  ok(await applicant.client.from('voyager_feed_entries').update({body:'Edited own reply'}).eq('id',reply).select().single(),'Owner edits reply')
  denied(await insert(applicant,randomUUID(),'Nested',{parent_id:reply}),'Nested reply denied')
  denied(await insert(voyager,randomUUID(),'Human impersonation',{author_id:architect.id}),'Human impersonation denied')
  denied(await insert(voyager,randomUUID(),'NPC impersonation',{author_id:npc.id}),'Voyager NPC publishing denied')
  ok(await insert(architect,npcPost,'NPC attribution',{author_id:npc.id}),'Human Architect publishes as NPC')
  denied(await insert(architect,randomUUID(),'NPC reply',{author_id:npc.id,parent_id:post}),'NPC reply denied')
  denied(await insert(architect,randomUUID(),'Forged creator',{creator_id:architect2.id}),'Forged creator denied')
  denied(await architect2.client.from('voyager_feed_entries').update({body:'Hijack NPC'}).eq('id',npcPost).select(),'Other Architect cannot edit NPC post')
  ok(await architect.client.from('voyager_feed_entries').update({body:'Creator edited NPC post'}).eq('id',npcPost).select().single(),'NPC human creator edits')
  denied(await voyager.client.from('voyager_feed_entries').update({author_id:architect.id}).eq('id',post).select(),'Immutable author denied')
  denied(await anon.from('voyager_feed_view').select('*'),'Guest read denied')
  assert.deepEqual(ok(await unregistered.client.from('voyager_feed_view').select('*'),'Unregistered read is empty'),[])
  denied(await insert(unregistered,randomUUID(),'Denied'),'Unregistered write denied')
  denied(await insert(voyager,post,'Duplicate'),'Duplicate request ID rejected')
  assert.equal(ok(await voyager.client.from('voyager_feed_entries').select('id').eq('id',post),'Stable ID count').length,1)

  // Real Storage upload/download; no mock storage tables.
  const imageId = randomUUID(), imagePath = `${voyager.id}/${imageId}.png`
  const image = await readFile(new URL('../../public/prototypes/voyager-feed/coast-v1.png',import.meta.url))
  ok(await voyager.client.storage.from('voyager-feed').upload(imagePath,image,{contentType:'image/png',upsert:false}),'Voyager uploads private image')
  objects.push(imagePath)
  denied(await applicant.client.storage.from('voyager-feed').download(imagePath),'Unreferenced image unreadable')
  ok(await insert(voyager,imageId,'Private image',{image_path:imagePath}),'Post references uploaded image')
  const blob = ok(await applicant.client.storage.from('voyager-feed').download(imagePath),'Registered reader downloads image')
  assert.equal(blob.size,image.length)
  denied(await anon.storage.from('voyager-feed').download(imagePath),'Guest private image denied')
  denied(await unregistered.client.storage.from('voyager-feed').download(imagePath),'Unregistered private image denied')
  denied(await applicant.client.storage.from('voyager-feed').upload(`${applicant.id}/${randomUUID()}.png`,image,{contentType:'image/png'}),'Applicant upload denied')
  denied(await voyager.client.storage.from('voyager-feed').upload(`${architect.id}/${randomUUID()}.png`,image,{contentType:'image/png'}),'Foreign image folder denied')
  denied(await voyager.client.storage.from('voyager-feed').upload(imagePath,image,{contentType:'image/png',upsert:true}),'Published attachment cannot be replaced')
  ok(await voyager.client.from('voyager_feed_entries').delete().eq('id',imageId).select().single(),'Owner deletes image post')
  denied(await applicant.client.storage.from('voyager-feed').download(imagePath),'Deleted post image unreadable')
  ok(await voyager.client.from('voyager_feed_entries').delete().eq('id',post).select().single(),'Owner deletes parent')
  assert.deepEqual(ok(await applicant.client.from('voyager_feed_entries').select('id').eq('id',reply),'Reply cascade'),[])
  assert.deepEqual(ok(await applicant.client.from('voyager_feed_likes').select('*').eq('entry_id',post),'Like cascade'),[])
  if (config.retainPhoneAccountsPath) {
    await writeFile(config.retainPhoneAccountsPath,JSON.stringify({projectRef:config.projectRef,accounts:[voyager,applicant,architect].map(({id,email,password})=>({id,email,password}))},null,2),{mode:0o600})
  }
  console.log(JSON.stringify({projectRef:config.projectRef,runId,status:'PASS',checks},null,2))
} finally {
  // IDs/paths are generated by this run; never sweep existing branch data.
  if (objects.length) { const result=await admin.storage.from('voyager-feed').remove(objects); if(result.error) console.error('QA object cleanup failed') }
  if (!config.retainPhoneAccountsPath) {
    for (const id of accounts) { const result=await admin.auth.admin.deleteUser(id); if(result.error) console.error('QA account cleanup failed:',id) }
  }
}
