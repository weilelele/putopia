/** Cards need a still image: a video URL is never an image fallback. */
export function stillImage(media: string, url?: string | null, poster?: string | null): string | undefined {
  const candidate = poster || (media === 'image' ? url : undefined)
  return candidate && !/\.(mp4|webm|mov|m4v|mp3|wav)(?:[?#]|$)/i.test(candidate) ? candidate : undefined
}
export type CoverAsset = { id: string; media: string; processed_url: string | null; display_url: string | null; display_order: number }
/** Newest voted day wins; otherwise the first visual from the newest day. */
export function chooseTuningCover(days: { assets: CoverAsset[]; responses: { selected_asset_id: string | null }[] }[]): string | undefined {
  let fallback: string | undefined
  for (const day of days) {
    const counts = new Map<string, number>()
    for (const r of day.responses) if (r.selected_asset_id) counts.set(r.selected_asset_id, (counts.get(r.selected_asset_id) ?? 0) + 1)
    const assets = day.assets.filter(a => stillImage(a.media, a.processed_url, a.display_url)).sort((a,b) => a.display_order - b.display_order)
    const best = assets.reduce<CoverAsset | undefined>((best,a) => !best || (counts.get(a.id) ?? 0) > (counts.get(best.id) ?? 0) ? a : best, undefined)
    if (!best) continue
    const image = stillImage(best.media, best.processed_url, best.display_url)
    if ((counts.get(best.id) ?? 0) > 0) return image
    fallback ??= image
  }
  return fallback
}
