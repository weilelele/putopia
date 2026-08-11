export const OFFLINE_SNAPSHOT_STORAGE_KEY = 'mc:offline:snapshot:v2'
export const OFFLINE_MEDIA_STORAGE_KEY = 'mc:offline:media:v2'
export const OFFLINE_SNAPSHOT_VERSION = 2
export const OFFLINE_SYNC_INTERVAL_MS = 5 * 60 * 1000

export type OfflineRole = 'guest' | 'applicant' | 'voyager' | 'architect'
export type OfflineTab = 'dashboard' | 'intel' | 'devices' | 'worlds' | 'voyagers'

export interface OfflineViewer {
  authenticated: boolean
  role: OfflineRole
  displayName: string | null
}

export interface OfflineWorld {
  id: string
  name: string
  name_en: string
  description: string
  image_path: string | null
  gradient_from: string
  gradient_to: string
  lifecycle_state: 'proposed' | 'picked' | 'syncing' | 'stable'
  discoverer_name: string
  discovery_date: string
  submitted_at: string | null
  created_at: string
}

export interface OfflineDevice {
  id: string
  name: string
  batch_id: string | null
  knowledge: 'known' | 'unknown'
  location: string
  description: string
  image_path: string | null
  status: 'available' | 'in_use' | 'needs_repair' | 'unknown' | null
  current_user_name: string | null
  exploration_progress: number
  updated_at: string
}

export interface OfflineIntel {
  id: string
  title: string
  content: string
  timestamp: string
  tag: 'NOTICE' | 'DEVICE' | 'ORG'
  images: string[]
  publisher_name: string | null
  created_at: string
}

export interface OfflineVoyager {
  id: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  role: 'voyager' | 'architect'
  observation_days: number
  worlds_discovered: number
  batch_label: string
  joined_at: string
}

export interface OfflineStory {
  id: string
  title: string
  excerpt: string
  content: string
  date: string
  tags: string[]
  youtube_id: string | null
  author_name: string
  author_id: string | null
  created_at: string
}

export interface OfflineVoteOption {
  id: string
  label: string
}

export interface OfflineVote {
  id: string
  title: string
  description: string | null
  type: 'single' | 'multi'
  scope: OfflineRole[]
  options: OfflineVoteOption[]
  is_active: boolean
  created_at: string
  ends_at: string | null
}

export interface OfflineFunction {
  id: string
  name: string
  status: 'active' | 'in_development' | 'unknown'
  sort_order: number
}

export interface OfflineSnapshot {
  version: 2
  syncedAt: string
  viewer: OfflineViewer
  worlds: OfflineWorld[]
  devices: OfflineDevice[]
  intel: OfflineIntel[]
  voyagers: OfflineVoyager[]
  stories: OfflineStory[]
  votes: OfflineVote[]
  functions: OfflineFunction[]
}

export type OfflineMediaMap = Record<string, string>

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isRecordArray(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every(isRecord)
}

export function parseOfflineSnapshot(value: unknown): OfflineSnapshot | null {
  let parsed = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value) as unknown
    } catch {
      return null
    }
  }
  if (!isRecord(parsed) || parsed.version !== OFFLINE_SNAPSHOT_VERSION || !isIsoDate(parsed.syncedAt)) return null
  if (!isRecord(parsed.viewer) || typeof parsed.viewer.authenticated !== 'boolean') return null
  if (!['guest', 'applicant', 'voyager', 'architect'].includes(String(parsed.viewer.role))) return null
  const sections = ['worlds', 'devices', 'intel', 'voyagers', 'stories', 'votes', 'functions'] as const
  if (!sections.every((section) => isRecordArray(parsed[section]))) return null

  return parsed as unknown as OfflineSnapshot
}

export function parseOfflineMediaMap(value: string | null): OfflineMediaMap {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    if (!isRecord(parsed)) return {}
    const entries = Object.entries(parsed).flatMap(([remote, local]) => (
      /^https:\/\//.test(remote) && typeof local === 'string' && local.startsWith('file://')
        ? [[remote, local] as [string, string]]
        : []
    ))
    return Object.fromEntries(entries)
  } catch {
    return {}
  }
}

export function collectOfflineMediaUrls(snapshot: OfflineSnapshot): string[] {
  const urls = [
    ...snapshot.worlds.map((item) => item.image_path),
    ...snapshot.devices.map((item) => item.image_path),
    ...snapshot.intel.flatMap((item) => item.images.slice(0, 1)),
    ...snapshot.voyagers.map((item) => item.avatar_url),
    ...snapshot.stories.map((item) => item.youtube_id
      ? `https://img.youtube.com/vi/${item.youtube_id}/hqdefault.jpg`
      : null),
  ]
  return [...new Set(urls.filter((url): url is string => typeof url === 'string' && /^https:\/\//.test(url)))].slice(0, 80)
}

export function offlineSnapshotScript(force = false): string {
  return `
    (function () {
      if (!location.hostname.endsWith('multiverseco.org')) return;
      var key = 'mc_ios_offline_snapshot_synced_at';
      var last = Number(localStorage.getItem(key) || 0);
      if (!${force ? 'true' : 'false'} && Date.now() - last < ${OFFLINE_SYNC_INTERVAL_MS}) return;
      fetch('/api/offline/snapshot', { credentials: 'include', cache: 'no-store' })
        .then(function (response) {
          if (!response.ok) throw new Error('Snapshot request failed: ' + response.status);
          return response.json();
        })
        .then(function (snapshot) {
          localStorage.setItem(key, String(Date.now()));
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'offline-snapshot',
            snapshot: snapshot
          }));
        })
        .catch(function () {});
    })();
    true;
  `
}
