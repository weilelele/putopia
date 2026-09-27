import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
const state = vi.hoisted(() => ({ client: null as unknown }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => state.client }))
import { getRoundInvestigations } from './dreamcatcher-rounds'

const opened = '2020-01-01T00:00:00Z'
const closed = '2020-01-02T00:00:00Z'
const records = {
  dreamcatcher_rounds: [{id:'round',world_id:'world',dreamcatcher_id:'room',initiator_id:'owner',round_number:2,status:'voting_open',task_id:'task',opened_at:opened,closes_at:closed}],
  worlds: [{id:'world',name:'Dream',discoverer_name:'Owner',discoverer_id:'changed-owner',vote_scope:'voters',lifecycle_state:'syncing'}],
  signal_tasks: [{id:'task',thread_id:'thread',prompt:'Choose a signal'}],
  signal_task_assets: [{id:'asset',task_id:'task',media:'image',processed_url:'https://example.com/image.webp',display_url:null,asset_role:'option',display_order:0}],
  signal_responses: [] as {task_id:string;user_id:string;selected_asset_id:string}[],
}
function mockClient(responses: typeof records.signal_responses = []) {
  const calls: string[] = []
  state.client = createClient('https://database.invalid', 'test-only', {
    auth: { persistSession:false,autoRefreshToken:false },
    global: { fetch: async (input) => {
      const url=new URL(String(input)); const table=url.pathname.split('/').at(-1) as keyof typeof records
      calls.push(table)
      const rows=table==='signal_responses'?responses:records[table]
      const offset=Number(url.searchParams.get('offset')??0)
      const limit=Number(url.searchParams.get('limit')??500)
      return new Response(JSON.stringify(rows.slice(offset,offset+limit)),{status:200,headers:{'content-type':'application/json'}})
    } },
  })
  return calls
}
beforeEach(()=>mockClient())
describe('public round feed boundaries',()=>{
  it('removes zero-response rounds from everyone except the original submitter',async()=>{
    expect(await getRoundInvestigations(null)).toEqual([])
    expect(await getRoundInvestigations({id:'admin',role:'architect'})).toEqual([])
    const own=await getRoundInvestigations({id:'owner',role:'applicant'})
    expect(own[0].days[0].task.canRespond).toBe(true)
    expect(own[0].days[0].task.initiatorOnly).toBe(true)
  })
  it('preserves read-only history and does not serialize internal identifiers',async()=>{
    const rows=await getRoundInvestigations(null,'world',true)
    expect(rows[0].days[0].task.closed).toBe(true)
    expect(rows[0].days[0].task.canRespond).toBe(false)
    expect(rows[0].days[0].task.assets[0]).not.toHaveProperty('task_id')
  })
  it('counts all responses beyond the API page cap so owner fallback cannot falsely reopen',async()=>{
    const calls=mockClient(Array.from({length:1101},(_,i)=>({task_id:'task',user_id:`voter-${i}`,selected_asset_id:'asset'})))
    const rows=await getRoundInvestigations({id:'owner',role:'applicant'},'world',true)
    expect(rows[0].days[0].task.participantCount).toBe(1101)
    expect(rows[0].days[0].task.initiatorOnly).toBe(false)
    expect(rows[0].days[0].task.distribution).toEqual({asset:1101})
    expect(calls.filter(t=>t==='signal_responses')).toHaveLength(3)
  })
})
