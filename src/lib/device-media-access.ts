export function isDeviceMediaPath(path: string): boolean {
  const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  return new RegExp(`^${uuid}/${uuid}\\.(jpg|png|webp|mp4|webm)$`, 'i').test(path)
}

export function referencesPublishedMedia(content: unknown, url: string): boolean {
  if (!content || typeof content !== 'object') return false
  const batch = content as { image?: unknown; updates?: unknown }
  if (batch.image === url) return true
  if (!Array.isArray(batch.updates)) return false
  return batch.updates.some((update) => {
    if (!update || !Array.isArray(update.media)) return false
    return update.media.some((media: { src?: unknown; poster?: unknown } | null) =>
      media?.src === url || media?.poster === url)
  })
}
