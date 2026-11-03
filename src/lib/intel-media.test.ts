import { describe, expect, it } from 'vitest'
import { INTEL_VIDEO_MAX_BYTES, intelStillImage, isIntelMediaUrl, validateIntelVideoFile, validateIntelVideoUrls } from './intel-media'

const SUPABASE = 'https://project.supabase.co'
const media = (path: string) => `${SUPABASE}/storage/v1/object/public/intel-images/${path}`

describe('Intel video file validation', () => {
  it('accepts an MP4 up to the size cap', () => {
    expect(validateIntelVideoFile({ name: 'reel.mp4', type: 'video/mp4', size: 12_000_000 })).toBeNull()
    expect(validateIntelVideoFile({ name: 'reel.mp4', type: 'video/mp4', size: INTEL_VIDEO_MAX_BYTES })).toBeNull()
    expect(validateIntelVideoFile({ name: 'REEL.MP4', type: '', size: 1 })).toBeNull()
  })
  it('rejects other containers, empty files and oversized files', () => {
    expect(validateIntelVideoFile({ name: 'reel.mov', type: 'video/quicktime', size: 1 })).toMatch(/MP4/)
    expect(validateIntelVideoFile({ name: 'reel.webm', type: 'video/webm', size: 1 })).toMatch(/MP4/)
    expect(validateIntelVideoFile({ name: 'reel.mp4', type: 'image/png', size: 1 })).toMatch(/MP4/)
    expect(validateIntelVideoFile({ name: 'reel.mp4', type: 'video/mp4', size: 0 })).toMatch(/empty/)
    expect(validateIntelVideoFile({ name: 'reel.mp4', type: 'video/mp4', size: INTEL_VIDEO_MAX_BYTES + 1 })).toMatch(/50 MB/)
  })
})

describe('Intel media URLs', () => {
  it('only accepts objects in this project\'s Intel bucket', () => {
    expect(isIntelMediaUrl(media('INT-000042/v.mp4'), SUPABASE)).toBe(true)
    expect(isIntelMediaUrl(media('INT-000042/v.mp4'), `${SUPABASE}/`)).toBe(true)
    expect(isIntelMediaUrl(media(''), SUPABASE)).toBe(false)
    expect(isIntelMediaUrl(media('../avatars/x.mp4'), SUPABASE)).toBe(false)
    expect(isIntelMediaUrl(`${SUPABASE}/storage/v1/object/public/avatars/v.mp4`, SUPABASE)).toBe(false)
    expect(isIntelMediaUrl('https://example.com/v.mp4', SUPABASE)).toBe(false)
    expect(isIntelMediaUrl(media('v.mp4'), undefined)).toBe(false)
  })
  it('requires a video for a cover and both to be Intel uploads', () => {
    expect(validateIntelVideoUrls({}, SUPABASE)).toBeNull()
    expect(validateIntelVideoUrls({ video_url: media('a.mp4'), video_poster_url: media('a.jpg') }, SUPABASE)).toBeNull()
    expect(validateIntelVideoUrls({ video_url: media('a.mp4') }, SUPABASE)).toBeNull()
    expect(validateIntelVideoUrls({ video_poster_url: media('a.jpg') }, SUPABASE)).toMatch(/needs a video/)
    expect(validateIntelVideoUrls({ video_url: 'https://example.com/a.mp4' }, SUPABASE)).toMatch(/Video must/)
    expect(validateIntelVideoUrls({ video_url: media('a.mp4'), video_poster_url: 'https://example.com/a.jpg' }, SUPABASE)).toMatch(/cover/)
  })
})

describe('Intel feed still', () => {
  it('prefers the first image, then the video cover', () => {
    expect(intelStillImage({ images: ['/a.jpg'], video_poster_url: '/p.jpg' })).toBe('/a.jpg')
    expect(intelStillImage({ images: [], video_poster_url: '/p.jpg' })).toBe('/p.jpg')
    expect(intelStillImage({ images: [] })).toBeNull()
  })
})
