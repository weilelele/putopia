import * as FileSystem from 'expo-file-system/legacy'
import type { OfflineMediaMap } from './offline'

const OFFLINE_MEDIA_DIRECTORY = `${FileSystem.cacheDirectory ?? ''}mc-offline-v2/`
const MAX_MEDIA_BYTES = 8 * 1024 * 1024

function hashUrl(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function extensionForUrl(value: string): string {
  try {
    const match = new URL(value).pathname.match(/\.([a-zA-Z0-9]{2,5})$/)
    return match ? `.${match[1].toLowerCase()}` : '.img'
  } catch {
    return '.img'
  }
}

async function fileExists(uri: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(uri)
  return info.exists && !info.isDirectory
}

async function cacheOne(remoteUrl: string, current: OfflineMediaMap): Promise<[string, string] | null> {
  const existing = current[remoteUrl]
  if (existing && await fileExists(existing).catch(() => false)) return [remoteUrl, existing]

  const localUri = `${OFFLINE_MEDIA_DIRECTORY}${hashUrl(remoteUrl)}${extensionForUrl(remoteUrl)}`
  try {
    const result = await FileSystem.downloadAsync(remoteUrl, localUri)
    if (result.status < 200 || result.status >= 300) {
      await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {})
      return null
    }
    const info = await FileSystem.getInfoAsync(localUri)
    if (!info.exists || info.isDirectory || (typeof info.size === 'number' && info.size > MAX_MEDIA_BYTES)) {
      await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {})
      return null
    }
    return [remoteUrl, localUri]
  } catch {
    await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {})
    return null
  }
}

export async function cacheOfflineMedia(
  remoteUrls: string[],
  current: OfflineMediaMap,
): Promise<OfflineMediaMap> {
  if (!FileSystem.cacheDirectory) return {}
  await FileSystem.makeDirectoryAsync(OFFLINE_MEDIA_DIRECTORY, { intermediates: true })

  const entries: [string, string][] = []
  for (let index = 0; index < remoteUrls.length; index += 4) {
    const batch = await Promise.all(
      remoteUrls.slice(index, index + 4).map((url) => cacheOne(url, current)),
    )
    entries.push(...batch.filter((entry): entry is [string, string] => entry !== null))
  }

  const next = Object.fromEntries(entries)
  const retainedNames = new Set(Object.values(next).map((uri) => uri.split('/').pop()))
  const names = await FileSystem.readDirectoryAsync(OFFLINE_MEDIA_DIRECTORY).catch(() => [])
  await Promise.all(names
    .filter((name) => !retainedNames.has(name))
    .map((name) => FileSystem.deleteAsync(`${OFFLINE_MEDIA_DIRECTORY}${name}`, { idempotent: true }).catch(() => {})))
  return next
}
