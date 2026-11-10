// Intel attachments: images and one optional MP4 video share the public
// `intel-images` bucket (see supabase/schema_v5.sql and schema_v112.sql).
export const INTEL_MEDIA_BUCKET = 'intel-images'
export const INTEL_VIDEO_TYPE = 'video/mp4'
export const INTEL_VIDEO_MAX_BYTES = 50 * 1024 * 1024

type FileLike = { name: string; type: string; size: number }

/** Browsers report MP4 as video/mp4; some leave the type empty, so the extension decides then. */
export function validateIntelVideoFile(file: FileLike): string | null {
  const isMp4 = file.type === INTEL_VIDEO_TYPE || (file.type === '' && /\.mp4$/i.test(file.name))
  if (!isMp4) return 'Video must be an MP4 file (H.264 video, AAC audio).'
  if (file.size <= 0) return 'This video file is empty.'
  if (file.size > INTEL_VIDEO_MAX_BYTES) return `Video must be ${INTEL_VIDEO_MAX_BYTES / 1024 / 1024} MB or smaller.`
  return null
}

/** Only objects uploaded to this project's Intel bucket may be attached to a post. */
export function isIntelMediaUrl(url: string, supabaseUrl: string | undefined): boolean {
  if (!supabaseUrl) return false
  const prefix = `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${INTEL_MEDIA_BUCKET}/`
  return url.startsWith(prefix) && url.length > prefix.length && !url.slice(prefix.length).split('/').includes('..')
}

export function validateIntelVideoUrls(
  entry: { video_url?: string | null; video_poster_url?: string | null },
  supabaseUrl: string | undefined,
): string | null {
  const { video_url, video_poster_url } = entry
  if (video_poster_url && !video_url) return 'A video cover needs a video.'
  if (video_url && !isIntelMediaUrl(video_url, supabaseUrl)) return 'Video must be uploaded to the Intel archive.'
  if (video_poster_url && !isIntelMediaUrl(video_poster_url, supabaseUrl)) return 'Video cover must be uploaded to the Intel archive.'
  return null
}

/** The still that represents a post in feeds: its first image, else its video cover. */
export function intelStillImage(entry: { images?: string[] | null; video_poster_url?: string | null }): string | null {
  return entry.images?.[0] ?? entry.video_poster_url ?? null
}
