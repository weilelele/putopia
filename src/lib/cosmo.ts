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

const COLL_CHANNEL = 'channel'
const COLL_IMAGE = 'ai-image'
const COLL_VIDEO = 'ai-video'

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
  duration?: number | null
  prompt?: string | null
  tags?: string[]
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

/** All live frequencies (channels with an assigned dial freq), with band summaries. */
export async function listFrequencies(): Promise<CosmoFrequency[]> {
  const d = await db()
  const channels = await d
    .collection(COLL_CHANNEL)
    .find({ deletedAt: null, freq: { $ne: null } })
    .sort({ freq: 1 })
    .toArray()
  return channels.map(mapFrequency)
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

  return docs.map((doc) => ({
    assetId: String(doc._id),
    media,
    url: doc.url as string,
    duration: typeof doc.duration === 'number' ? doc.duration : null,
    prompt: doc.prompt ?? null,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
  }))
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
