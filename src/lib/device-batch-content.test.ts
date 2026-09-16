import { describe, expect, it } from 'vitest'
import { getDeviceBatch } from './__fixtures__/device-batches'
import { getDeviceBatchMedia, getDeviceBatchProgress, getDeviceBatchUpdates, getUpdatePublicationState } from './device-batch-content'
import { createBatchConfigDraft, normalizeBatchConfigDraft, parseBatchConfigDrafts, validateBatchConfigDraft } from './device-batch-config-drafts'

const batch = getDeviceBatch('cairo-batch-01')!
const image = { kind: 'image' as const, src: '/assets/device.png', alt: 'Device', caption: 'Field record' }

describe('device update content', () => {
  it('does not import legacy latest reports, archive history or hero media', () => {
    const original = { ...batch, heroMedia: [image] }
    const draft = createBatchConfigDraft(original)
    expect(draft.updates).toEqual([])
    expect(draft.latestUpdate.title).toBe('')
    expect(getDeviceBatchMedia(original)).toEqual([])
    expect(validateBatchConfigDraft(draft)).toEqual([])
  })

  it('allows deleting the last update and round-trips an empty list', () => {
    const draft = createBatchConfigDraft({ ...batch, updates: [] })
    const saved = normalizeBatchConfigDraft(draft)
    expect(validateBatchConfigDraft(saved)).toEqual([])
    expect(saved.latestUpdate).toMatchObject({ title: '', body: '' })
    expect(parseBatchConfigDrafts(JSON.stringify({ test: saved })).test.updates).toEqual([])
  })

  it('distinguishes published reports, unpublished edits and new reports', () => {
    const update = { id: 'live', date: '2026-09-16', title: 'Live report', body: 'Published text', media: [image] }
    const published = [update]
    expect(getUpdatePublicationState({ ...update }, published)).toBe('PUBLISHED')
    expect(getUpdatePublicationState({ ...update, body: 'Edited text' }, published)).toBe('UNPUBLISHED CHANGES')
    expect(getUpdatePublicationState({ ...update, id: 'new' }, published)).toBe('DRAFT')
    expect(published[0].body).toBe('Published text')
  })

  it('uses canonical updates and does not resurrect removed legacy media', () => {
    const updated = { ...batch, heroMedia: [image], updates: [{ id: 'one', date: '2026-09-16', title: 'New', body: 'Text' }] }
    expect(getDeviceBatchUpdates(updated)).toEqual(updated.updates)
    expect(getDeviceBatchMedia(updated)).toEqual([])
  })

  it('deduplicates gallery media while preserving each update and video metadata', () => {
    const video = { ...image, kind: 'video' as const, src: '/assets/clip.mp4', poster: image.src }
    const updates = [
      { id: 'a', date: '2026-09-16', title: 'A', body: '', media: [image, video] },
      { id: 'b', date: '2026-09-15', title: 'B', body: '', media: [image] },
    ]
    expect(getDeviceBatchMedia({ ...batch, updates })).toEqual([image, video])
    const draft = createBatchConfigDraft({ ...batch, updates })
    expect(validateBatchConfigDraft(draft)).toEqual([])
    const saved = normalizeBatchConfigDraft(draft)
    expect(parseBatchConfigDrafts(JSON.stringify({ test: saved })).test.updates).toEqual(updates)
  })

  it('rejects duplicate updates and unsafe media URLs', () => {
    const update = { id: 'one', date: 'Today', title: 'Test', body: '', media: [{ ...image, src: 'javascript:alert(1)' }] }
    const errors = validateBatchConfigDraft(createBatchConfigDraft({ ...batch, updates: [update, update] }))
    expect(errors).toContain('Media needs an HTTPS URL or a local asset path.')
    expect(errors).toContain('Updates need unique IDs and valid content.')
  })

  it('derives all five steps from the single batch status', () => {
    const phases = ['searching', 'claiming', 'pack_one', 'pack_two', 'console'] as const
    for (const [current, status] of phases.entries()) {
      const progress = getDeviceBatchProgress({ ...batch, status, distributionStages: [] })
      expect(progress.map((step) => step.label)).toEqual(['SEARCH', 'CLAIM', 'PACK 1', 'PACK 2', 'CONSOLE'])
      expect(progress.map((step) => step.status)).toEqual(phases.map((_, index) => index < current ? 'completed' : index === current ? 'current' : 'upcoming'))
    }
  })
})
