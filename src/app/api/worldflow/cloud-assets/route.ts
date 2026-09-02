import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { WorldflowCloudAsset } from '@/lib/actions/worldflow'
import { asWorldflowAdmin } from '@/lib/worldflow-database'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '请先登录。' }, { status: 401 })

  const media = new URL(request.url).searchParams.get('media')
  if (media !== 'image' && media !== 'video' && media !== 'mixed') {
    return NextResponse.json({ error: '素材类型无效。' }, { status: 400 })
  }

  const admin = asWorldflowAdmin(createAdminClient())
  const signalQuery = admin
    .from('signal_task_assets')
    .select('id, media, source_channel_name, source_band_name, processed_url, display_url, created_at, is_selected')
    .in('media', media === 'mixed' ? ['image', 'video'] : [media])
    .eq('is_selected', true)
    .not('processed_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(80)
  const finalQuery = admin
    .from('world_final_assets')
    .select('id, world_id, media, url, poster_url, created_at')
    .in('media', media === 'mixed' ? ['image', 'video'] : [media])
    .order('created_at', { ascending: false })
    .limit(40)

  const [{ data: signalRows, error: signalError }, { data: finalRows, error: finalError }] = await Promise.all([signalQuery, finalQuery])
  if (signalError || finalError) {
    return NextResponse.json(
      {
        error: signalError?.message ?? finalError?.message ?? '云端素材读取失败。',
      },
      { status: 500 },
    )
  }

  const signalAssets: WorldflowCloudAsset[] = (signalRows ?? []).flatMap((row) => {
    if ((row.media !== 'image' && row.media !== 'video') || !row.processed_url) return []
    return [
      {
        id: row.id,
        media_type: row.media,
        name: row.source_channel_name || row.source_band_name || `云端生成素材 ${row.id.slice(0, 8)}`,
        preview_url: row.display_url || row.processed_url,
        provider: 'signal_task_assets',
        source_url: row.processed_url,
        created_at: row.created_at,
      },
    ]
  })
  const finalAssets: WorldflowCloudAsset[] = (finalRows ?? []).map((row) => ({
    id: row.id,
    media_type: row.media,
    name: `归档世界 ${row.world_id}`,
    preview_url: row.poster_url || row.url,
    provider: 'world_final_assets',
    source_url: row.url,
    created_at: row.created_at,
  }))

  const assets = [...signalAssets, ...finalAssets].sort((left, right) => right.created_at.localeCompare(left.created_at)).slice(0, 100)
  return NextResponse.json({ assets })
}
