/**
 * schema.org VideoObject markup for the videos the site shows, so search and AI
 * answer engines can find them, read what they show and quote their narration.
 * Names and descriptions state plain facts; the films themselves stay in-world.
 */
import { SITE_DESCRIPTION, SITE_URL } from './site-seo'
import { CONSOLE_GUIDE_FILM } from './console-guide-film'
import { DEVICE_REEL } from './device-reel'
import type { Intel } from '@/types/database'

export type SiteVideo = {
  name: string
  description: string
  /** Site path or absolute URL of the video file. */
  contentUrl: string
  thumbnailUrl: string
  /** ISO 8601, with offset, when the file first went live. */
  uploadDate: string
  durationSeconds?: number
  /** Spoken narration, as captioned in the film. */
  transcript?: string
}

/** Whole seconds as an ISO 8601 duration, e.g. 77.2 → PT1M17S. */
export function isoDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${s || total === 0 ? `${s}S` : ''}`
}

export function absoluteUrl(pathOrUrl: string): string {
  return /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}

export function videoObjectJsonLd(video: SiteVideo, pageUrl: string, id = 'video') {
  return {
    '@type': 'VideoObject',
    '@id': `${pageUrl}#${id}`,
    name: video.name,
    description: video.description,
    thumbnailUrl: [absoluteUrl(video.thumbnailUrl)],
    uploadDate: video.uploadDate,
    contentUrl: absoluteUrl(video.contentUrl),
    ...(video.durationSeconds ? { duration: isoDuration(video.durationSeconds) } : {}),
    ...(video.transcript ? { transcript: video.transcript } : {}),
    url: pageUrl,
    inLanguage: 'en',
    publisher: { '@id': `${SITE_URL}/#organization` },
  }
}

/** Narration of the "How it works" film (orientation-reel ReelHowItWorks captions). */
const CONSOLE_GUIDE_TRANSCRIPT = [
  'This is the Multiverse Console. It will live in your home.',
  'This one is the frequency dial. Every frequency is a parallel world that exists.',
  'Close to the right number, you will see shapes. On it, you may see a certain place.',
  'And this one — the band dial. It chooses where, in that world, it watches from.',
  'And this — the quantum energy button. Hold it. Wait.',
  'What will happen next depends on the world.',
  'End of orientation. Stay on the frequency.',
].join(' ')

/** Narration of Voyager Orientation Reel 01 (orientation-reel Reel01 captions). */
const REEL_01_TRANSCRIPT = [
  'Welcome, Voyager. If this tape has reached you, you were noticed.',
  'The Multiverse Collective existed for many years for only one purpose: to find the worlds beside this one — and to watch them. Not imagine them. Watch them.',
  'So from today, you are part of the work.',
  CONSOLE_GUIDE_TRANSCRIPT,
].join(' ')

export const SITE_VIDEOS = {
  consoleGuide: {
    name: 'How the Multiverse Console works — Voyager Orientation',
    description:
      'A narrated guide to the Multiverse Console, the retro sci-fi device at the centre of Multiverse Collective, a hardware-based sci-fi game. ' +
      'The left dial sets the frequency, and each frequency is a parallel world. The right dial selects the band: where in that world the Console watches from. ' +
      'Holding the quantum button for three seconds sends energy across, and what happens next depends on the world. Shot as an archival VHS orientation tape, with captions.',
    contentUrl: CONSOLE_GUIDE_FILM.src,
    thumbnailUrl: CONSOLE_GUIDE_FILM.poster,
    uploadDate: '2026-11-06T15:20:26-08:00',
    durationSeconds: 77.248,
    transcript: CONSOLE_GUIDE_TRANSCRIPT,
  },
  deviceReel: {
    name: 'Multiverse Console demo: tuning into a parallel world',
    description:
      'A short, silent clip of the Multiverse Console, the physical device in Multiverse Collective, a hardware-based sci-fi game. ' +
      'A Voyager turns the frequency dial until static resolves into a ruined bridge in a parallel world, then holds the quantum button on top.',
    contentUrl: DEVICE_REEL.src,
    thumbnailUrl: DEVICE_REEL.poster,
    uploadDate: '2026-10-21T12:28:09-07:00',
    durationSeconds: 19.708,
  },
} satisfies Record<string, SiteVideo>

/** VideoObjects for /devices: the hero reel (when shown) and the "How it works" film. */
export function devicesPageVideosJsonLd({ heroVideo }: { heroVideo: boolean }) {
  const pageUrl = `${SITE_URL}/devices`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      ...(heroVideo ? [videoObjectJsonLd(SITE_VIDEOS.deviceReel, pageUrl, 'console-demo')] : []),
      videoObjectJsonLd(SITE_VIDEOS.consoleGuide, pageUrl, 'how-it-works'),
    ],
  }
}

/**
 * Known films posted to Intel, keyed by the uploaded file so a replaced upload
 * drops details that no longer describe it.
 */
const INTEL_VIDEO_DETAILS: Record<string, Pick<SiteVideo, 'durationSeconds' | 'transcript'>> = {
  'https://oxwfnmcwovxnrvagxzdz.supabase.co/storage/v1/object/public/intel-images/INT-640135/1793673805217-wbch1wfgap.mp4': {
    durationSeconds: 97.387,
    transcript: REEL_01_TRANSCRIPT,
  },
}

const EXCERPT_LENGTH = 280

/** First paragraph of an Intel post, cut at a word boundary. */
export function intelExcerpt(content: string, max = EXCERPT_LENGTH): string {
  const text = content.trim().split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ')
  if (text.length <= max) return text
  const cut = text.slice(0, max + 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : text.slice(0, max)).replace(/[\s,;:—-]+$/, '')}…`
}

type IntelVideoSource = Pick<Intel, 'id' | 'title' | 'content' | 'timestamp' | 'classified' | 'images' | 'video_url' | 'video_poster_url'>

/** VideoObject for a public Intel post with a video; null when there is nothing to mark up. */
export function intelVideoJsonLd(entry: IntelVideoSource) {
  if (entry.classified || !entry.video_url) return null
  const thumbnail = entry.video_poster_url ?? entry.images?.[0] ?? DEVICE_REEL.poster
  const excerpt = intelExcerpt(entry.content)
  const video: SiteVideo = {
    name: entry.title,
    description: excerpt ? `${excerpt} ${SITE_DESCRIPTION}` : SITE_DESCRIPTION,
    contentUrl: entry.video_url,
    thumbnailUrl: thumbnail,
    uploadDate: entry.timestamp,
    ...INTEL_VIDEO_DETAILS[entry.video_url],
  }
  return { '@context': 'https://schema.org', ...videoObjectJsonLd(video, `${SITE_URL}/intel/${encodeURIComponent(entry.id)}`) }
}
