import 'server-only'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { listDeviceLibraryEntries } from '@/lib/device-library-repository'
import { readDashboardCovers } from './dashboard-covers'
import { stillImage } from './dashboard-media'
import type { DashboardUpdate } from './dashboard-model'
/** Each source contributes its newest ten events before the global cutoff. */
export const readDashboardUpdates = unstable_cache(async (canSeeClassified: boolean): Promise<{ updates: DashboardUpdate[]; incomplete: boolean }> => {
  const db = createAdminClient()
  const [intel, tuning, established, members, devices, finals, activity, coverResult] = await Promise.all([
    db.from('intel').select('id,title,content,images,classified,timestamp,publisher_id,publisher_name').order('timestamp', { ascending:false }).limit(10),
    db.from('signal_threads').select('id,created_at,world_id').not('world_id','is',null).order('created_at',{ascending:false}).limit(10),
    db.from('activity_events').select('id,created_at,target_id,target_title,target_image,target_href').eq('event_type','world_established').eq('is_visible',true).order('created_at',{ascending:false}).limit(10),
    db.from('activity_events').select('id,created_at,actor_name,actor_id,target_href').eq('event_type','voyager_activated').or('actor_role.is.null,actor_role.neq.architect').eq('is_visible',true).order('created_at',{ascending:false}).limit(10),
    listDeviceLibraryEntries().then(data=>({data,error:false})).catch(()=>({data:[],error:true})),
    db.from('world_final_assets').select('id,world_id,media,url,poster_url,created_at,worlds!inner(lifecycle_state)').eq('worlds.lifecycle_state','stable').order('created_at',{ascending:false}).limit(10),
    db.from('activity_events').select('id,event_type,created_at,target_id,target_title,target_image,target_href').in('event_type',['device_updated']).eq('is_visible',true).order('created_at',{ascending:false}).limit(10),
    readDashboardCovers().then(data=>({data,error:false})).catch(()=>({data:{} as Record<string,string>,error:true})),
  ])
  const incomplete = Boolean(intel.error || tuning.error || established.error || members.error || devices.error || finals.error || activity.error || coverResult.error)
  const publisherIds = [...new Set((intel.data ?? []).filter(item => !item.classified || canSeeClassified).flatMap(item => item.publisher_id ? [item.publisher_id] : []))]
  const publishers = publisherIds.length ? await db.from('voyager_profiles').select('id,avatar_url').in('id',publisherIds) : {data:[],error:null}
  const avatars = new Map((publishers.data ?? []).map(item => [item.id,item.avatar_url]))
  const tuningRows = (tuning.data ?? []) as { id: string; created_at: string; world_id: string | null }[]
  const worldIds = [...new Set([...tuningRows, ...(finals.data ?? [])].flatMap(item => item.world_id ? [item.world_id] : []))]
  const worlds = worldIds.length ? await db.from('worlds').select('id,name,name_en,description,image_path').in('id',worldIds) : {data:[],error:null}
  const worldMap = new Map((worlds.data ?? []).map(item => [item.id,item]))
  return { incomplete: incomplete || Boolean(worlds.error || publishers.error), updates: [
    ...(intel.data ?? []).map(item => {
      const locked = item.classified && !canSeeClassified
      return {id:`intel-${item.id}`,occurredAt:item.timestamp,category:'Intel',title:item.title,description:locked ? undefined : item.content.slice(0,180),image:locked ? null : item.images?.[0],images:locked ? undefined : item.images,authorName:locked ? undefined : item.publisher_name ?? 'Multiverse Collective',authorAvatar:locked ? null : avatars.get(item.publisher_id ?? '') ?? null,href:`/intel/${encodeURIComponent(item.id)}`,locked}
    }),
    ...tuningRows.flatMap(item => {
      const world = item.world_id ? worldMap.get(item.world_id) : null
      return world ? [{id:`tuning-${item.id}`,occurredAt:item.created_at,category:'Signal tuning',title:world.name_en || world.name,description:world.description?.slice(0,180),image:coverResult.data[world.id] || world.image_path,href:`/worlds/${encodeURIComponent(world.id)}`}] : []
    }),
    ...(established.data ?? []).map(item => ({id:`established-${item.id}`,occurredAt:item.created_at,category:'Established world',title:item.target_title ?? 'A world entered the archive',image:item.target_image,href:item.target_id ? `/worlds/${encodeURIComponent(item.target_id)}` : '/worlds'})),
    ...(members.data ?? []).map(item => ({id:`activation-${item.id}`,occurredAt:item.created_at,category:'Voyager activated',title:`${item.actor_name} joined the Collective`,href:'/voyagers'})),
    ...(finals.data ?? []).flatMap(item => {
      const world = worldMap.get(item.world_id)
      return world ? [{id:`final-${item.id}`,occurredAt:item.created_at,category:'Established world',title:world.name_en || world.name,description:'Final form published',image:stillImage(item.media,item.url,item.poster_url) || world.image_path,href:`/worlds/${encodeURIComponent(world.id)}`}] : []
    }),
    ...(activity.data ?? []).map(item => ({id:`device-event-${item.id}`,occurredAt:item.created_at,category:'Device update',title:item.target_title ?? 'Device archive updated',image:stillImage('image',item.target_image),href:item.target_href?.startsWith('/') && !item.target_href.startsWith('//') ? item.target_href : '/devices'})),
    ...devices.data.sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at)).slice(0,10).map(item=>({id:`device-${item.id}`,occurredAt:item.updated_at,category:'Device update',title:item.name,description:item.description,image:item.image_path,href:item.href})),
  ] }
}, ['dashboard-event-updates-v3'], { revalidate:30 })
