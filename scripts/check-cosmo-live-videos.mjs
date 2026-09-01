#!/usr/bin/env node

import { MongoClient, ObjectId } from 'mongodb'

const SOURCE = {
  channelId: '6a85654041b16262cb633ac7',
  bandId: '6a85655f41b16262cb633aef',
  roomSlug: 'kyoto-02',
}

const PHASE_LABELS = {
  resting: '休息中（循环）',
  starting: '进入工作（一次）',
  working: '工作中（循环）',
  stopping: '结束工作（一次）',
}

// Keep these tokens aligned with src/lib/dreamcatcher-live.ts. Matching is by
// inclusion because Cosmo tags can include a location/device prefix.
const PHASE_TAGS = {
  resting: ['休息中', '待机'],
  starting: ['进入工作', '开始工作'],
  working: ['工作中'],
  stopping: ['结束工作'],
}

function groupLiveVideos(videos) {
  const library = { resting: [], starting: [], working: [], stopping: [] }
  for (const video of videos) {
    for (const [phase, tokens] of Object.entries(PHASE_TAGS)) {
      if (video.tags.some((tag) => tokens.some((token) => tag.includes(token)))) {
        library[phase].push({ assetId: video.assetId, url: video.url })
        break
      }
    }
  }
  return library
}

function exclusionReason(video) {
  if (!video) return '素材记录不存在'
  if (video.status !== 'completed') return `处理状态为 ${video.status ?? 'unknown'}`
  if (video.deletedAt != null) return '已删除'
  if (video.url == null) return '缺少视频 URL'
  return null
}

async function main() {
  const uri = process.env.COSMO_MONGO_URI
  if (!uri) {
    throw new Error('缺少 COSMO_MONGO_URI；请在 .env.local 中配置只读连接。')
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15_000 })

  try {
    await client.connect()
    const database = client.db('cosmo')
    const channel = await database.collection('channel').findOne({
      _id: new ObjectId(SOURCE.channelId),
    })

    if (!channel) throw new Error(`找不到 channel ${SOURCE.channelId}`)

    const band = channel.bands?.find((item) => String(item._id) === SOURCE.bandId)
    if (!band) throw new Error(`找不到 band ${SOURCE.bandId}`)

    const poolIds = Array.isArray(band.videoPoolIds) ? band.videoPoolIds : []
    const objectIds = poolIds.flatMap((id) => {
      try {
        return [id instanceof ObjectId ? id : new ObjectId(String(id))]
      } catch {
        return []
      }
    })

    const videoDocs = objectIds.length
      ? await database
          .collection('ai-video')
          .find({ _id: { $in: objectIds } })
          .project({ url: 1, tags: 1, status: 1, deletedAt: 1 })
          .toArray()
      : []
    const videoById = new Map(videoDocs.map((video) => [String(video._id), video]))

    const excluded = []
    const eligible = []
    for (const id of poolIds) {
      const assetId = String(id)
      const video = videoById.get(assetId)
      const reason = exclusionReason(video)
      if (reason) {
        excluded.push({ assetId, reason })
        continue
      }
      eligible.push({
        assetId,
        media: 'video',
        url: video.url,
        tags: Array.isArray(video.tags) ? video.tags : [],
      })
    }

    const library = groupLiveVideos(eligible)
    const recognizedIds = new Set(Object.values(library).flat().map((video) => video.assetId))
    const unrecognized = eligible.filter((video) => !recognizedIds.has(video.assetId))
    const ready = Object.values(library).every((videos) => videos.length > 0)

    console.log(`Cosmo 直播素材检查：${channel.name ?? SOURCE.channelId} / ${band.name ?? SOURCE.bandId}`)
    console.log(`设备：${SOURCE.roomSlug}；band 池共 ${poolIds.length} 条视频`)
    for (const [phase, label] of Object.entries(PHASE_LABELS)) {
      console.log(`- ${label}: ${library[phase].length} 条`)
    }
    console.log(`- 未识别标签: ${unrecognized.length} 条`)
    console.log(`- 不可用素材: ${excluded.length} 条`)

    if (unrecognized.length) {
      console.log('\n未识别标签的素材：')
      for (const video of unrecognized) {
        console.log(`- ${video.assetId}: ${video.tags.join(', ') || '无标签'}`)
      }
    }
    if (excluded.length) {
      console.log('\n不会进入直播页的素材：')
      for (const video of excluded) console.log(`- ${video.assetId}: ${video.reason}`)
    }

    console.log(
      ready
        ? '\n结果：四类素材齐全。直播页会在下一次刷新后自动读取这些视频。'
        : '\n结果：素材池可读取，但至少缺少一个阶段；请按上面的四类标签补齐。',
    )
    console.log('直播页路径：/worlds/live')
  } finally {
    await client.close()
  }
}

main().catch((error) => {
  console.error(`检查失败：${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
