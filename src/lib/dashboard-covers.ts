import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { chooseTuningCover, type CoverAsset } from './dashboard-media'
/** Batch the existing Signal cover policy instead of making queries per card. */
export const readDashboardCovers = unstable_cache(async (): Promise<Record<string, string>> => {
  const db = createAdminClient() as SupabaseClient
  const threads = await db.from('signal_threads').select('id,world_id').not('world_id','is',null).returns<{id:string;world_id:string}[]>()
  if (threads.error) throw threads.error
  if (!threads.data?.length) return {}
  const tasks = await db.from('signal_tasks').select('id,thread_id,day_index').eq('is_published',true).in('thread_id',threads.data.map(t=>t.id)).order('day_index',{ascending:false}).returns<{id:string;thread_id:string;day_index:number}[]>()
  if (tasks.error) throw tasks.error
  const byThread = new Map<string, string[]>()
  for (const task of tasks.data ?? []) {
    const ids = byThread.get(task.thread_id) ?? []
    if (ids.length < 2) ids.push(task.id)
    byThread.set(task.thread_id, ids)
  }
  const ids = [...byThread.values()].flat()
  if (!ids.length) return {}
  type Response = { task_id:string; selected_asset_id:string|null }
  async function loadResponses() {
    const data: Response[] = []
    for (let offset = 0; ; offset += 1000) {
      const page = await db.from('signal_responses').select('task_id,selected_asset_id').in('task_id',ids)
        .order('id').range(offset,offset + 999).returns<Response[]>()
      if (page.error) throw page.error
      data.push(...(page.data ?? []))
      if ((page.data?.length ?? 0) < 1000) return data
    }
  }
  const [assets, responses] = await Promise.all([
    db.from('signal_task_assets').select('id,task_id,media,processed_url,display_url,display_order').in('task_id',ids).eq('is_selected',true).returns<(CoverAsset & {task_id:string})[]>(),
    loadResponses(),
  ])
  if (assets.error) throw assets.error
  const covers: Record<string,string> = {}
  for (const thread of threads.data) {
    const image = chooseTuningCover((byThread.get(thread.id) ?? []).map(id=>({
      assets: (assets.data ?? []).filter(a=>a.task_id === id) as CoverAsset[],
      responses: responses.filter(r=>r.task_id === id),
    })))
    if (image && thread.world_id) covers[thread.world_id] = image
  }
  return covers
}, ['dashboard-covers-v1'], { revalidate:60 })
