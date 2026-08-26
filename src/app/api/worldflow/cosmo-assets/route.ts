import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBandAssets, listFrequencies, type CosmoMedia } from '@/lib/cosmo'
import type { WorldflowCloudAsset, WorldflowCosmoChannel } from '@/lib/actions/worldflow'
import { matchesWorldflowCosmoChannel } from '@/lib/worldflow-cosmo'

export const dynamic = 'force-dynamic'

function serializeChannel(channel: Awaited<ReturnType<typeof listFrequencies>>[number]): WorldflowCosmoChannel {
  return {
    id: channel.channelId,
    name: channel.name,
    number: channel.freq,
    description: channel.description ?? null,
    bands: channel.bands
      .filter((band) => band.enabled)
      .map((band) => ({
        id: band.bandId,
        name: band.name,
        image_count: band.imageCount,
        video_count: band.videoCount,
      })),
  }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '请先登录。' }, { status: 401 })

  const params = new URL(request.url).searchParams
  const query = (params.get('q') ?? '').trim().slice(0, 120)
  const channelId = params.get('channelId') ?? ''
  const bandId = params.get('bandId') ?? ''
  const media = params.get('media')
  if (media !== 'image' && media !== 'video' && media !== 'mixed') {
    return NextResponse.json({ error: '素材类型无效。' }, { status: 400 })
  }

  try {
    const frequencies = await listFrequencies()
    const channels = frequencies.filter((channel) => matchesWorldflowCosmoChannel(query, channel)).slice(0, 40)
    if (!channelId || !bandId) {
      return NextResponse.json({ channels: channels.map(serializeChannel), assets: [] })
    }

    const channel = frequencies.find((item) => item.channelId === channelId)
    const band = channel?.bands.find((item) => item.bandId === bandId && item.enabled)
    if (!channel || !band) {
      return NextResponse.json({ error: '找不到这个 Cosmo 频道或波段。' }, { status: 404 })
    }

    const mediaTypes: CosmoMedia[] = media === 'mixed' ? ['image', 'video'] : [media]
    const groups = await Promise.all(mediaTypes.map((kind) => getBandAssets(channelId, bandId, kind)))
    const assets: WorldflowCloudAsset[] = groups
      .flat()
      .slice(0, 160)
      .map((asset) => ({
        id: asset.assetId,
        media_type: asset.media,
        name: (asset.prompt?.trim() || `${channel.name} / ${band.name}`).slice(0, 160),
        preview_url: asset.posterUrl || asset.url,
        provider: 'cosmo',
        source_url: asset.url,
        created_at: new Date(0).toISOString(),
        channel_id: channel.channelId,
        channel_name: channel.name,
        channel_number: channel.freq,
        band_id: band.bandId,
        band_name: band.name,
      }))

    return NextResponse.json({ channel: serializeChannel(channel), channels: [], assets })
  } catch (error) {
    console.error('[worldflow] Cosmo asset lookup failed', error)
    return NextResponse.json({ error: 'Cosmo 素材读取失败，请稍后重试。' }, { status: 502 })
  }
}
