import { describe, expect, it } from 'vitest'
import { isDeviceMediaPath, referencesPublishedMedia } from './device-media-access'

describe('device media read boundary', () => {
  const path = 'fb295015-bdf8-475a-b5ee-ae2e3cf0fb0c/fb295015-bdf8-475a-b5ee-ae2e3cf0fb0c.jpg'
  const url = `/api/device-media/${path}`
  it('accepts only generated storage paths', () => {
    expect(isDeviceMediaPath(path)).toBe(true)
    for (const invalid of ['../' + path, path + '/extra', path.replace('.jpg', '.svg'), 'file.jpg']) {
      expect(isDeviceMediaPath(invalid)).toBe(false)
    }
  })
  it('grants access to explicit published attachments and cover only', () => {
    expect(referencesPublishedMedia({ updates: [{ media: [{ src: url }] }] }, url)).toBe(true)
    expect(referencesPublishedMedia({ updates: [{ media: [{ poster: url }] }] }, url)).toBe(true)
    expect(referencesPublishedMedia({ image: url }, url)).toBe(true)
    expect(referencesPublishedMedia({ content: { updates: [{ media: [{ src: url }] }] }, published_content: { updates: [] } }, url)).toBe(false)
    expect(referencesPublishedMedia({ heroMedia: [{ src: url }], updates: [] }, url)).toBe(false)
    expect(referencesPublishedMedia(null, url)).toBe(false)
  })
})
