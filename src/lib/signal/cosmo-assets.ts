import type { CosmoAsset } from '@/lib/cosmo'

/** Same processed clip / animated poster lookup for legacy days and new rounds. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolveCosmoSignalAsset(admin: any, clip: CosmoAsset) {
  const bucket = admin.storage.from('signal-assets')
  const { data: found } = await bucket.list('cosmo', { search: clip.assetId })
  const names = new Set((found ?? []).map((file: { name: string }) => file.name))
  const path = names.has(`${clip.assetId}.mp4`) ? `cosmo/${clip.assetId}.mp4` : null
  return {
    assetId: clip.assetId,
    media: clip.media,
    url: clip.url,
    processedUrl: path ? bucket.getPublicUrl(path).data.publicUrl : clip.url,
    processedPath: path,
    posterUrl: names.has(`${clip.assetId}.webp`)
      ? bucket.getPublicUrl(`cosmo/${clip.assetId}.webp`).data.publicUrl
      : clip.posterUrl ?? null,
  }
}
