import { describe, it, expect } from 'vitest'
import { isDeviceCameraBinding, parseCameraOrigin, buildCameraEmbedUrl, isCameraStatusMessage, type DeviceCameraBinding } from './device-camera'
import { createBatchConfigDraft, normalizeBatchConfigDraft, parseBatchConfigDrafts, validateBatchConfigDraft } from './device-batch-config-drafts'
import { getDeviceBatch } from './__fixtures__/device-batches'
import { rowToBatch } from './device-batch-records'

const camera: DeviceCameraBinding = { provider: 'cosmo', channelId: '6a0419e515e35a5f46396a85', bandId: '6a0419f615e35a5f46396a8f', title: 'Camera', fit: 'contain' }
describe('Device camera embedding', () => {
  it('only accepts known providers, real IDs, and bounded titles', () => {
    expect(isDeviceCameraBinding(camera)).toBe(true)
    for (const patch of [{ provider: 'other' }, { channelId: '../admin' }, { bandId: '' }, { title: '' }, { title: 'x'.repeat(121) }, { fit: 'stretch' }]) expect(isDeviceCameraBinding({ ...camera, ...patch })).toBe(false)
  })
  it('requires an HTTPS deployment origin and only permits HTTP loopback in development', () => {
    expect(parseCameraOrigin('https://camera.example.com', false)).toBe('https://camera.example.com')
    expect(parseCameraOrigin('http://localhost:8082', true)).toBe('http://localhost:8082')
    expect(parseCameraOrigin('https://*.example.com', false)).toBeNull()
    for (const origin of ['http://localhost:8082', 'http://example.com', 'https://user:pass@example.com', 'https://example.com/path', 'javascript:alert(1)', 'https://example.com?token=secret']) expect(parseCameraOrigin(origin, false)).toBeNull()
  })
  it('only builds the published route with silent autoplay and explicit parent origin', () => {
    const url = new URL(buildCameraEmbedUrl({ binding: camera, embedOrigin: 'https://camera.example.com', demo: false }, 'https://multiverseco.org'))
    expect(url.pathname).toBe(`/embed/${camera.channelId}/${camera.bandId}`)
    expect(url.searchParams.get('muted')).toBe('1')
    expect(url.searchParams.get('clock')).toBe('0')
    expect(url.searchParams.get('parentOrigin')).toBe('https://multiverseco.org')
    expect(url.searchParams.has('t')).toBe(false)
  })
  it('rejects messages for other cameras, protocol versions and invented states', () => {
    const message = { type: 'cosmo.embed.status', version: 1, channelId: camera.channelId, bandId: camera.bandId, state: 'playing', muted: true }
    expect(isCameraStatusMessage(message, camera)).toBe(true)
    for (const patch of [{ version: 2 }, { bandId: 'other' }, { state: 'live' }, { muted: 'true' }]) expect(isCameraStatusMessage({ ...message, ...patch }, camera)).toBe(false)
  })
  it('round-trips the optional binding through draft validation and normalization', () => {
    const batch = { ...getDeviceBatch('cairo-batch-01')!, liveCamera: camera }
    const draft = createBatchConfigDraft(batch)
    expect(draft.liveCamera).not.toBe(camera)
    expect(validateBatchConfigDraft(draft)).toEqual([])
    expect(parseBatchConfigDrafts(JSON.stringify({ [batch.slug]: draft }))[batch.slug].liveCamera).toEqual(camera)
    expect(normalizeBatchConfigDraft({ ...draft, liveCamera: { ...camera, title: ' Camera ' } }).liveCamera?.title).toBe('Camera')
    expect(validateBatchConfigDraft({ ...draft, liveCamera: { ...camera, bandId: 'bad' } })).toHaveLength(1)
  })
  it('keeps published camera separate from an unpublished draft without a schema change', () => {
    const published = { ...getDeviceBatch('cairo-batch-01')!, liveCamera: camera }
    const row = { content: { ...published, liveCamera: undefined }, published_content: published, publication_status: 'published' as const, revision: 1, listing_quantity: 64, claimed_quantity: 0, reserved_quantity: 0, price_amount: null, price_currency: null }
    expect(rowToBatch(row, true)?.liveCamera).toEqual(camera)
    expect(rowToBatch(row)?.liveCamera).toBeUndefined()
  })
})
