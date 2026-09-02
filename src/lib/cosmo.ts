/**
 * Cosmo content source (read-only).
 *
 * Cosmo is a separate MongoDB (db `cosmo`) holding the multiverse material for
 * Signal Tasks puzzles. A "frequency" = a `channel` (has `freq` 80–120 + embedded
 * `bands[]`). Each band's assets live in `imagePoolIds` / `videoPoolIds`, resolved
 * against the `ai-image` / `ai-video` collections (filter completed + not deleted).
 *
 * Audio puzzles extract the audio track from `ai-video` clips downstream (Cosmo has
 * no reliable standalone audio source — band `soundtrack[]` is not always present).
 *
 * See docs / memory `reference_putopia_cosmo_content` and ~/Downloads/cosmo-db-guide.md.
 * Connection string: COSMO_MONGO_URI.
 */
import { MongoClient, ObjectId, type Db, type WithId, type Document } from 'mongodb'
import {
  groupDreamcatcherLiveVideos,
  type DreamcatcherLiveVideoLibrary,
} from '@/lib/dreamcatcher-live'

const COLL_CHANNEL = 'channel'
const COLL_IMAGE = 'ai-image'
const COLL_VIDEO = 'ai-video'
const COLL_CUBICLE = 'cubicle'

export const DREAMCATCHER_LIVE_VIDEO_SOURCE = {
  roomSlug: 'kyoto-02',
  channelId: '6a85654041b16262cb633ac7',
  bandId: '6a85655f41b16262cb633aef',
} as const

export const DEVICE_LIVE_VIDEO_SOURCE = {
  channelId: '6a8ecbc041b16262cb634785',
  bandId: '6a8ecbcf41b16262cb634790',
} as const

export type CosmoMedia = 'image' | 'video'

export interface CosmoBand {
  bandId: string
  name: string
  type: string // currently always 'video'
  enabled: boolean
  imageCount: number
  videoCount: number
}

export interface CosmoFrequency {
  channelId: string
  name: string
  freq: number | null
  description?: string | null
  bands: CosmoBand[]
}

export interface CosmoAsset {
  assetId: string
  media: CosmoMedia
  url: string
  /** Still preview for video assets — the AI clip's start frame (an ai-image
   *  .webp). Lets the picker show the first frame instead of a black <video>. */
  posterUrl?: string | null
  duration?: number | null
  prompt?: string | null
  tags?: string[]
}

export type CosmoLiveVideo = Pick<CosmoAsset, 'assetId' | 'url' | 'posterUrl'>

export interface CosmoBandAsset {
  asset: CosmoAsset
  band: CosmoBand
  channel: CosmoFrequency
}

// ── Connection singleton (survives Next.js hot reloads) ──────────────────────
const globalForCosmo = globalThis as unknown as {
  __cosmoClientPromise?: Promise<MongoClient>
}

function getClient(): Promise<MongoClient> {
  const uri = process.env.COSMO_MONGO_URI
  if (!uri) throw new Error('COSMO_MONGO_URI is not set')
  if (!globalForCosmo.__cosmoClientPromise) {
    globalForCosmo.__cosmoClientPromise = new MongoClient(uri, {
      serverSelectionTimeoutMS: 15000,
    }).connect()
  }
  return globalForCosmo.__cosmoClientPromise
}

async function db(): Promise<Db> {
  return (await getClient()).db('cosmo')
}

// ── Mapping helpers ──────────────────────────────────────────────────────────
function toObjectIds(ids: unknown): ObjectId[] {
  if (!Array.isArray(ids)) return []
  return ids
    .map((v) => {
      try {
        return v instanceof ObjectId ? v : new ObjectId(String(v))
      } catch {
        return null
      }
    })
    .filter((v): v is ObjectId => v !== null)
}

function mapBand(band: Document): CosmoBand {
  return {
    bandId: String(band._id),
    name: band.name ?? '',
    type: band.type ?? 'video',
    enabled: band.enabled !== false,
    imageCount: Array.isArray(band.imagePoolIds) ? band.imagePoolIds.length : 0,
    videoCount: Array.isArray(band.videoPoolIds) ? band.videoPoolIds.length : 0,
  }
}

function mapFrequency(ch: WithId<Document>): CosmoFrequency {
  const bands = Array.isArray(ch.bands) ? ch.bands.map(mapBand) : []
  return {
    channelId: String(ch._id),
    name: ch.name ?? '',
    freq: typeof ch.freq === 'number' ? ch.freq : null,
    description: ch.description ?? null,
    bands,
  }
}

function findBand(ch: Document, bandId: string): Document | null {
  if (!Array.isArray(ch.bands)) return null
  return ch.bands.find((b: Document) => String(b._id) === bandId) ?? null
}

// ── Public API ───────────────────────────────────────────────────────────────

/** All live channels usable in the Forge, with band summaries. Includes channels
 *  that haven't been assigned a dial freq yet — those are still valid asset
 *  sources for puzzle authoring. Scheduled channels (with a freq) sort first by
 *  freq; unscheduled ones follow, ordered by name. */
export async function listFrequencies(): Promise<CosmoFrequency[]> {
  const d = await db()
  const channels = await d
    .collection(COLL_CHANNEL)
    .find({ deletedAt: null })
    .toArray()
  return channels.map(mapFrequency).sort((a, b) => {
    if (a.freq !== null && b.freq !== null) return a.freq - b.freq
    if (a.freq !== null) return -1 // scheduled before unscheduled
    if (b.freq !== null) return 1
    return a.name.localeCompare(b.name)
  })
}

/** A single frequency by channel id. */
export async function getFrequency(channelId: string): Promise<CosmoFrequency | null> {
  const d = await db()
  let _id: ObjectId
  try {
    _id = new ObjectId(channelId)
  } catch {
    return null
  }
  const ch = await d.collection(COLL_CHANNEL).findOne({ _id })
  return ch ? mapFrequency(ch) : null
}

/** Resolve one completed asset and verify that it belongs to the requested band.
 *  This intentionally avoids loading the band's entire pool or resolving video
 *  poster frames, which are unnecessary when creating a zero-copy association. */
export async function getBandAssetById(
  channelId: string,
  bandId: string,
  media: CosmoMedia,
  assetId: string,
): Promise<CosmoBandAsset | null> {
  const d = await db()
  let channelObjectId: ObjectId
  let assetObjectId: ObjectId
  try {
    channelObjectId = new ObjectId(channelId)
    assetObjectId = new ObjectId(assetId)
  } catch {
    return null
  }

  const collection = media === 'image' ? COLL_IMAGE : COLL_VIDEO
  const [channelDocument, assetDocument] = await Promise.all([
    d.collection(COLL_CHANNEL).findOne({ _id: channelObjectId }),
    d.collection(collection).findOne({
      _id: assetObjectId,
      status: 'completed',
      deletedAt: null,
      url: { $ne: null },
    }),
  ])
  if (!channelDocument || !assetDocument) return null

  const bandDocument = findBand(channelDocument, bandId)
  if (!bandDocument || bandDocument.enabled === false) return null
  const poolIds = toObjectIds(
    media === 'image' ? bandDocument.imagePoolIds : bandDocument.videoPoolIds,
  )
  if (!poolIds.some((poolId) => poolId.equals(assetObjectId))) return null

  return {
    asset: {
      assetId: String(assetDocument._id),
      media,
      url: assetDocument.url as string,
      duration:
        typeof assetDocument.duration === 'number' ? assetDocument.duration : null,
      prompt: assetDocument.prompt ?? null,
      tags: Array.isArray(assetDocument.tags) ? assetDocument.tags : [],
    },
    band: mapBand(bandDocument),
    channel: mapFrequency(channelDocument),
  }
}

/**
 * Usable assets for a given (channel, band). For `media: 'video'` this also serves
 * audio puzzles (caller extracts the audio track afterwards).
 */
export async function getBandAssets(
  channelId: string,
  bandId: string,
  media: CosmoMedia,
): Promise<CosmoAsset[]> {
  const d = await db()
  let _id: ObjectId
  try {
    _id = new ObjectId(channelId)
  } catch {
    return []
  }
  const ch = await d.collection(COLL_CHANNEL).findOne({ _id })
  if (!ch) return []
  const band = findBand(ch, bandId)
  if (!band) return []

  const poolIds = toObjectIds(media === 'image' ? band.imagePoolIds : band.videoPoolIds)
  if (poolIds.length === 0) return []

  const coll = media === 'image' ? COLL_IMAGE : COLL_VIDEO
  const docs = await d
    .collection(coll)
    .find({ _id: { $in: poolIds }, status: 'completed', deletedAt: null, url: { $ne: null } })
    .toArray()

  // For video, resolve each clip's start frame (an ai-image .webp) as a still
  // poster so the picker can show the first frame instead of a black <video>.
  const posterById = new Map<string, string>()
  if (media === 'video') {
    const frameOids = toObjectIds(docs.map((doc) => doc.startFrameId).filter(Boolean))
    if (frameOids.length) {
      const frames = await d
        .collection(COLL_IMAGE)
        .find({ _id: { $in: frameOids }, url: { $ne: null } })
        .project({ url: 1 })
        .toArray()
      const frameUrl = new Map(frames.map((f) => [String(f._id), f.url as string]))
      for (const doc of docs) {
        const fid = doc.startFrameId ? String(doc.startFrameId) : null
        if (fid && frameUrl.has(fid)) posterById.set(String(doc._id), frameUrl.get(fid)!)
      }
    }
  }

  const docById = new Map(docs.map((doc) => [String(doc._id), doc]))
  return poolIds.flatMap((poolId) => {
    const doc = docById.get(String(poolId))
    if (!doc) return []
    return [{
    assetId: String(doc._id),
    media,
    url: doc.url as string,
    posterUrl: posterById.get(String(doc._id)) ?? null,
    duration: typeof doc.duration === 'number' ? doc.duration : null,
    prompt: doc.prompt ?? null,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    }]
  })
}

/** Randomly sample up to `n` usable assets from a (channel, band). */
export async function sampleBandAssets(
  channelId: string,
  bandId: string,
  media: CosmoMedia,
  n: number,
): Promise<CosmoAsset[]> {
  const all = await getBandAssets(channelId, bandId, media)
  if (all.length <= n) return shuffle(all)
  return shuffle(all).slice(0, n)
}

/** Tagged live-camera material for the first Worlds device. This deliberately
 *  resolves the band's pool on every call rather than persisting asset ids, so
 *  newly completed, non-deleted videos added to the Cosmo band are picked up on
 *  the next dynamic page request. */
export async function getDreamcatcherLiveVideoLibrary(): Promise<DreamcatcherLiveVideoLibrary> {
  const assets = await getBandAssets(
    DREAMCATCHER_LIVE_VIDEO_SOURCE.channelId,
    DREAMCATCHER_LIVE_VIDEO_SOURCE.bandId,
    'video',
  )
  return groupDreamcatcherLiveVideos(assets)
}

/** Live material for the demonstration Console on the Devices pages. The band
 *  pool order is preserved by `getBandAssets`, so playback follows the order
 *  curated in Cosmo and wraps back to the first clip on the client. */
export async function getDeviceLiveVideoPlaylist(): Promise<CosmoLiveVideo[]> {
  const assets = await getBandAssets(
    DEVICE_LIVE_VIDEO_SOURCE.channelId,
    DEVICE_LIVE_VIDEO_SOURCE.bandId,
    'video',
  )
  return assets.map(({ assetId, posterUrl, url }) => ({ assetId, posterUrl, url }))
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Cubicle (Signal Tuning v2) ───────────────────────────────────────────────
// A world's cubicle is the agent workspace Cosmo builds. MCo reads two things
// from it: whether the world has been bootstrapped (ready to request expansions)
// and the expansion candidates (clips) to turn into a puzzle day. Read-only.

export type CosmoBootstrapStatus = 'pending' | 'bootstrapped' | 'rejected'

export interface CosmoBootstrap {
  status: CosmoBootstrapStatus
  rejectReason?: string | null
}

/** One expansion candidate from a world's cubicle: a clip (+ still poster) the
 *  crowd can be shown. `sessionId` groups a batch (one expansion run = up to 4).
 *  Build a puzzle tile from a `videos` entry and set its `source_asset_id` to that
 *  video's `assetId` — that is how Cosmo resolves a crowd pick back to this
 *  expansion on settle. (`expansionId` is Cosmo's internal id, exposed for
 *  audit/logging; picks travel by video `assetId`, not this.) */
export interface CosmoExpansion {
  expansionId: string
  sessionId: string
  direction: string
  pickedOn: string | null
  createdAt: string | null
  videos: CosmoAsset[]
}

/** Resolve a world → its Cosmo channel → its cubicle, via `channel.mco.worldId`.
 *  Null if the world isn't linked in Cosmo yet (not onboarded / no cubicle). */
async function getCubicleByWorldId(worldId: string): Promise<WithId<Document> | null> {
  const d = await db()
  const channel = await d.collection(COLL_CHANNEL).findOne({ 'mco.worldId': worldId })
  if (!channel) return null
  return d.collection(COLL_CUBICLE).findOne({ channelId: channel._id })
}

/** A world's bootstrap outcome, or null if not linked in Cosmo yet.
 *  'bootstrapped' = ready to request expansions; 'rejected' = Cosmo declined the
 *  seed (see rejectReason); 'pending' = still working. */
export async function getWorldBootstrap(worldId: string): Promise<CosmoBootstrap | null> {
  const cubicle = await getCubicleByWorldId(worldId)
  if (!cubicle) return null
  const b = cubicle.bootstrap as { status?: CosmoBootstrapStatus; rejectReason?: string } | undefined
  return { status: b?.status ?? 'pending', rejectReason: b?.rejectReason ?? null }
}

/** Bootstrap status for many worlds in one pass — two queries, not one-per-world.
 *  A world appears in the map only if Cosmo has a channel for it (i.e. it's
 *  onboarded); the value is its cubicle's bootstrap status ('pending' if the
 *  cubicle is somehow missing). Absent from the map = not onboarded in Cosmo. */
export async function getWorldBootstraps(
  worldIds: string[],
): Promise<Map<string, CosmoBootstrapStatus>> {
  const out = new Map<string, CosmoBootstrapStatus>()
  if (!worldIds.length) return out
  const d = await db()

  const channels = await d
    .collection(COLL_CHANNEL)
    .find({ 'mco.worldId': { $in: worldIds } }, { projection: { _id: 1, 'mco.worldId': 1 } })
    .toArray()
  if (!channels.length) return out

  const worldByChannel = new Map<string, string>()
  for (const ch of channels) {
    const wid = (ch.mco as { worldId?: string } | undefined)?.worldId
    if (!wid) continue
    worldByChannel.set(String(ch._id), wid)
    out.set(wid, 'pending') // has a channel = onboarded; refined by its cubicle below
  }

  const cubicles = await d
    .collection(COLL_CUBICLE)
    .find(
      { channelId: { $in: channels.map((ch) => ch._id) } },
      { projection: { channelId: 1, 'bootstrap.status': 1 } },
    )
    .toArray()
  for (const cub of cubicles) {
    const wid = worldByChannel.get(String(cub.channelId))
    if (!wid) continue
    const status = (cub.bootstrap as { status?: CosmoBootstrapStatus } | undefined)?.status
    if (status) out.set(wid, status)
  }
  return out
}

/** A world's expansion candidates (clips + posters), newest first, grouped-able
 *  by `sessionId`. Empty if the world isn't linked or has no batch yet. Only
 *  clips that are completed + not deleted are returned; an expansion whose clip
 *  didn't resolve comes back with `videos: []` (skip it when building tiles). */
export async function getWorldExpansions(worldId: string): Promise<CosmoExpansion[]> {
  const cubicle = await getCubicleByWorldId(worldId)
  const rows = Array.isArray(cubicle?.expansions) ? (cubicle.expansions as Document[]) : []
  if (rows.length === 0) return []

  // Resolve every clip across all expansions in one pass (+ start-frame posters).
  const d = await db()
  const videoOids = toObjectIds(rows.flatMap((e) => (Array.isArray(e.videoIds) ? e.videoIds : [])))
  const byId = new Map<string, CosmoAsset>()
  if (videoOids.length) {
    const docs = await d
      .collection(COLL_VIDEO)
      .find({ _id: { $in: videoOids }, status: 'completed', deletedAt: null, url: { $ne: null } })
      .toArray()
    const frameOids = toObjectIds(docs.map((doc) => doc.startFrameId).filter(Boolean))
    const frameUrl = new Map<string, string>()
    if (frameOids.length) {
      const frames = await d
        .collection(COLL_IMAGE)
        .find({ _id: { $in: frameOids }, url: { $ne: null } })
        .project({ url: 1 })
        .toArray()
      for (const f of frames) frameUrl.set(String(f._id), f.url as string)
    }
    for (const doc of docs) {
      const fid = doc.startFrameId ? String(doc.startFrameId) : null
      byId.set(String(doc._id), {
        assetId: String(doc._id),
        media: 'video',
        url: doc.url as string,
        posterUrl: fid && frameUrl.has(fid) ? frameUrl.get(fid)! : null,
        duration: typeof doc.duration === 'number' ? doc.duration : null,
        prompt: doc.prompt ?? null,
        tags: Array.isArray(doc.tags) ? doc.tags : [],
      })
    }
  }

  return rows
    .map((e) => ({
      expansionId: String(e._id),
      sessionId: String(e.sessionId),
      direction: typeof e.direction === 'string' ? e.direction : '',
      pickedOn: e.pickedOn ? new Date(e.pickedOn).toISOString() : null,
      createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : null,
      videos: toObjectIds(e.videoIds)
        .map((oid) => byId.get(String(oid)))
        .filter((v): v is CosmoAsset => !!v),
    }))
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}
