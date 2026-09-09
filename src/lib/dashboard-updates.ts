import 'server-only'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { listDeviceLibraryEntries } from '@/lib/device-library-repository'
import type { DashboardUpdate } from './dashboard-model'
/** Each source contributes its newest ten events before the global cutoff. */
export const readDashboardUpdates = unstable_cache(async (canSeeClassified: boolean): Promise<DashboardUpdate[]> => {
  const db = createAdminClient()
  const [intel, tuning, established, members, devices] = await Promise.all([
    db.from('intel').select('id,title,content,images,classified,timestamp').order('timestamp', { ascending:false }).limit(10),
    db.from('signal_threads').select('id,created_at,world_id').not('world_id','is',null).order('created_at',{ascending:false}).limit(10),
    db.from('activity_events').select('id,created_at,target_id,target_title,target_image,target_href').eq('event_type','world_established').eq('is_visible',true).order('created_at',{ascending:false}).limit(10),
    db.from('activity_events').select('id,created_at,actor_name,actor_id,target_href').eq('event_type','voyager_activated').eq('is_visible',true).order('created_at',{ascending:false}).limit(10),
    listDeviceLibraryEntries(),
  ])
  if (intel.error || tuning.error || established.error || members.error) throw new Error('Some update sources could not be loaded')
  const tuningRows = (tuning.data ?? []) as { id: string; created_at: string; world_id: string | null }[]
  const worldIds = [...new Set(tuningRows.flatMap(item => item.world_id ? [item.world_id] : []))]
  const worlds = worldIds.length ? await db.from('worlds').select('id,name,name_en,description,image_path').in('id',worldIds) : {data:[],error:null}
  if (worlds.error) throw new Error('World update details could not be loaded')
  const worldMap = new Map((worlds.data ?? []).map(item => [item.id,item]))
  return [
    ...(intel.data ?? []).map(item => {
      const locked = item.classified && !canSeeClassified
      return {id:`intel-${item.id}`,occurredAt:item.timestamp,category:'Intel',title:item.title,description:locked ? undefined : item.content.slice(0,180),image:locked ? null : item.images?.[0],href:`/intel/${encodeURIComponent(item.id)}`,locked}
    }),
    ...tuningRows.flatMap(item => {
      const world = item.world_id ? worldMap.get(item.world_id) : null
      return world ? [{id:`tuning-${item.id}`,occurredAt:item.created_at,category:'Signal tuning',title:world.name_en || world.name,description:world.description?.slice(0,180),image:world.image_path,href:`/worlds/${encodeURIComponent(world.id)}`}] : []
    }),
    ...(established.data ?? []).map(item => ({id:`established-${item.id}`,occurredAt:item.created_at,category:'Established world',title:item.target_title ?? 'A world entered the archive',image:item.target_image,href:item.target_id ? `/worlds/${encodeURIComponent(item.target_id)}` : '/worlds'})),
    ...(members.data ?? []).map(item => ({id:`activation-${item.id}`,occurredAt:item.created_at,category:'Voyager activated',title:`${item.actor_name} joined the Collective`,href:'/voyagers'})),
    ...devices.sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at)).slice(0,10).map(item=>({id:`device-${item.id}`,occurredAt:item.updated_at,category:'Device update',title:item.name,description:item.description,image:item.image_path,href:item.href})),
  ]
}, ['dashboard-event-updates-v1'], { revalidate:30 })
