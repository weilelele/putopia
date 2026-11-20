import { describe, expect, it } from 'vitest'
import { CONSOLE_GUIDE_FILM } from './console-guide-film'
import { DEVICE_REEL } from './device-reel'
import { SITE_DESCRIPTION, SITE_URL, serializeJsonLd } from './site-seo'
import { SITE_VIDEOS, absoluteUrl, devicesPageVideosJsonLd, intelExcerpt, intelVideoJsonLd, isoDuration, videoObjectJsonLd } from './video-seo'

const REEL_01_URL = 'https://oxwfnmcwovxnrvagxzdz.supabase.co/storage/v1/object/public/intel-images/INT-640135/1793673805217-wbch1wfgap.mp4'

const intel = {
  id: 'INT-640135',
  title: 'Voyager Orientation, Reel 01: What We Are and the Console',
  content: 'Some things are easier to show than to write down, so we put them on tape.\n\nThis is Reel 01 of our Voyager Orientation series.',
  timestamp: '2026-11-03T02:42:00+00:00',
  classified: false,
  images: [] as string[],
  video_url: REEL_01_URL,
  video_poster_url: 'https://oxwfnmcwovxnrvagxzdz.supabase.co/storage/v1/object/public/intel-images/INT-640135/cover.jpg',
}

describe('video SEO structured data', () => {
  it('writes durations as ISO 8601', () => {
    expect(isoDuration(77.248)).toBe('PT1M17S')
    expect(isoDuration(19.708)).toBe('PT20S')
    expect(isoDuration(120)).toBe('PT2M')
    expect(isoDuration(3725)).toBe('PT1H2M5S')
    expect(isoDuration(0)).toBe('PT0S')
  })

  it('makes site paths absolute and leaves full URLs alone', () => {
    expect(absoluteUrl('/assets/a.mp4')).toBe(`${SITE_URL}/assets/a.mp4`)
    expect(absoluteUrl(REEL_01_URL)).toBe(REEL_01_URL)
  })

  it('describes the films the Devices page actually plays', () => {
    expect(SITE_VIDEOS.consoleGuide.contentUrl).toBe(CONSOLE_GUIDE_FILM.src)
    expect(SITE_VIDEOS.consoleGuide.thumbnailUrl).toBe(CONSOLE_GUIDE_FILM.poster)
    expect(SITE_VIDEOS.deviceReel.contentUrl).toBe(DEVICE_REEL.src)
    expect(SITE_VIDEOS.deviceReel.thumbnailUrl).toBe(DEVICE_REEL.poster)
  })

  it('carries every field Google requires, plus duration and transcript', () => {
    const video = videoObjectJsonLd(SITE_VIDEOS.consoleGuide, `${SITE_URL}/devices`, 'how-it-works')
    expect(video).toMatchObject({
      '@type': 'VideoObject',
      '@id': `${SITE_URL}/devices#how-it-works`,
      thumbnailUrl: [`${SITE_URL}${CONSOLE_GUIDE_FILM.poster}`],
      contentUrl: `${SITE_URL}${CONSOLE_GUIDE_FILM.src}`,
      duration: 'PT1M17S',
      publisher: { '@id': `${SITE_URL}/#organization` },
    })
    expect(video.name).toBeTruthy()
    expect(video.description).toMatch(/hardware-based sci-fi game/)
    expect(Number.isNaN(Date.parse(video.uploadDate))).toBe(false)
    expect(video.transcript).toMatch(/^This is the Multiverse Console\./)
  })

  it('names the device and category in plain words in every site film', () => {
    for (const video of Object.values(SITE_VIDEOS)) {
      expect(video.description).toMatch(/Multiverse Console/)
      expect(video.description).toMatch(/hardware-based sci-fi game/)
    }
  })

  it('lists the hero reel on /devices only when the page shows it', () => {
    const ids = (heroVideo: boolean) => devicesPageVideosJsonLd({ heroVideo })['@graph'].map((v) => v['@id'])
    expect(ids(true)).toEqual([`${SITE_URL}/devices#console-demo`, `${SITE_URL}/devices#how-it-works`])
    expect(ids(false)).toEqual([`${SITE_URL}/devices#how-it-works`])
  })

  it('marks up a public Intel video with its cover, date and canonical description', () => {
    const video = intelVideoJsonLd(intel)!
    expect(video).toMatchObject({
      '@context': 'https://schema.org',
      '@id': `${SITE_URL}/intel/INT-640135#video`,
      name: intel.title,
      thumbnailUrl: [intel.video_poster_url],
      uploadDate: intel.timestamp,
      contentUrl: REEL_01_URL,
      url: `${SITE_URL}/intel/INT-640135`,
    })
    expect(video.description).toBe(`Some things are easier to show than to write down, so we put them on tape. This is Reel 01 of our Voyager Orientation series. ${SITE_DESCRIPTION}`)
  })

  it('adds duration and transcript only for a known upload', () => {
    expect(intelVideoJsonLd(intel)).toMatchObject({ duration: 'PT1M37S', transcript: expect.stringMatching(/^Welcome, Voyager\./) })
    const replaced = intelVideoJsonLd({ ...intel, video_url: REEL_01_URL.replace('wbch1wfgap', 'other') })!
    expect(replaced).not.toHaveProperty('duration')
    expect(replaced).not.toHaveProperty('transcript')
  })

  it('skips classified posts and posts without a video', () => {
    expect(intelVideoJsonLd({ ...intel, classified: true })).toBeNull()
    expect(intelVideoJsonLd({ ...intel, video_url: null })).toBeNull()
  })

  it('falls back to the first image, then the Console reel poster, for the thumbnail', () => {
    const image = 'https://oxwfnmcwovxnrvagxzdz.supabase.co/storage/v1/object/public/intel-images/INT-1/a.jpg'
    expect(intelVideoJsonLd({ ...intel, video_poster_url: null, images: [image] })?.thumbnailUrl).toEqual([image])
    expect(intelVideoJsonLd({ ...intel, video_poster_url: null })?.thumbnailUrl).toEqual([`${SITE_URL}${DEVICE_REEL.poster}`])
  })

  it('cuts long Intel text at a word boundary', () => {
    const excerpt = intelExcerpt('word '.repeat(100), 50)
    expect(excerpt.length).toBeLessThanOrEqual(51)
    expect(excerpt).toMatch(/word…$/)
    expect(intelExcerpt('  short  \n\n  text ')).toBe('short text')
  })

  it('serializes Intel text safely inside a script tag', () => {
    const video = intelVideoJsonLd({ ...intel, title: '</script><script>alert(1)</script>' })
    expect(serializeJsonLd(video)).not.toContain('<')
  })
})
