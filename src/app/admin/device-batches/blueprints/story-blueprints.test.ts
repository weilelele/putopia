import { describe, expect, it } from 'vitest'
import {
  canApproveAdaptation,
  canApproveContent,
  canScheduleContent,
  toStoryWorkspaceSlug,
  validateStoryAdaptation,
  validateStoryContentDraft,
  type StoryAdaptation,
  type StoryContentItem,
  type StoryWorkflow,
} from '@/lib/story-workflows'

const adaptation: StoryAdaptation = {
  core: [
    { label: 'Device signature', value: 'Exposed components.' },
    { label: 'Provenance', value: 'An engineer may have built the Batch.' },
    { label: 'Restoration conflict', value: 'Repair may change the tuning path.' },
    { label: 'Narrative hook', value: 'A familiar figure appears in one route.' },
  ],
  storyEngine: 'Preserve the route before repairing the devices.',
  confirmed: ['The Batch was found.'],
  estimates: ['The former owner built it.'],
  unresolved: ['Who appears in the route?'],
  phases: ['01', '02', '03', '04'].map((number) => ({
    number,
    label: `Phase ${number}`,
    purpose: 'Advance the investigation.',
    beats: ['Record one material fact.'],
    gate: 'Stop until the evidence is reviewed.',
  })),
  votes: [],
  atmosphere: ['Treat the devices as working instruments.'],
  boundaries: ['Do not invent an identity.'],
  nextQuestions: ['What evidence was recovered?'],
}

const contentItem: StoryContentItem = {
  id: 'content-1',
  workflowId: 'workflow-1',
  position: 1,
  title: 'First field record',
  channel: 'Platform archive',
  contentType: 'Field report',
  body: 'The first inspection is complete.',
  narrativePurpose: 'Establish the evidence boundary.',
  facts: ['The Batch was found.'],
  requiredAssets: ['Wide field photograph'],
  recommendedPublishAt: '2026-08-10T10:00:00.000Z',
  timingRationale: 'Publish before restoration begins.',
  dependencies: [],
  followUp: 'Restoration baseline report',
  status: 'in_review',
  reviewNote: '',
  storyRevision: 3,
  version: 1,
  scheduledFor: null,
  approvedAt: null,
  publishedAt: null,
  createdAt: '2026-08-07T00:00:00.000Z',
  updatedAt: '2026-08-07T00:00:00.000Z',
}

function workflow(overrides: Partial<StoryWorkflow> = {}): StoryWorkflow {
  return {
    id: 'workflow-1',
    workspaceSlug: 'test-batch',
    batchName: 'Test Batch',
    location: 'Test Location',
    sourceStory: 'A complete source story long enough for validation.',
    sourceVersion: 1,
    adaptation,
    adaptationStatus: 'in_review',
    adaptationRevision: 3,
    adaptationApprovedRevision: null,
    reviewNote: '',
    version: 1,
    approvedAt: null,
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
    contentItems: [contentItem],
    ...overrides,
  }
}

describe('Story Lab review gates', () => {
  it('accepts a complete four-phase English adaptation', () => {
    expect(validateStoryAdaptation(adaptation)).toEqual([])
    expect(JSON.stringify(adaptation)).not.toMatch(/[\u3400-\u9fff]/u)
  })

  it('rejects more than one vote and more than three beats per phase', () => {
    const invalid = {
      ...adaptation,
      phases: adaptation.phases.map((phase, index) => index === 0
        ? { ...phase, beats: ['1', '2', '3', '4'] }
        : phase),
      votes: [
        { question: 'A?', whyNow: 'Now', options: ['1', '2'], fixed: 'Safety', result: 'Report' },
        { question: 'B?', whyNow: 'Now', options: ['1', '2'], fixed: 'Safety', result: 'Report' },
      ],
    }
    expect(validateStoryAdaptation(invalid)).toEqual(expect.arrayContaining([
      'Every phase needs a label, purpose, one to three beats, and a gate.',
      'The adaptation may contain at most one vote.',
    ]))
  })

  it('allows Gate 1 approval only while the complete adaptation is in review', () => {
    expect(canApproveAdaptation(workflow())).toBe(true)
    expect(canApproveAdaptation(workflow({ adaptationStatus: 'draft' }))).toBe(false)
  })

  it('requires the current approved story revision for content approval and scheduling', () => {
    const approvedWorkflow = workflow({
      adaptationStatus: 'approved',
      adaptationApprovedRevision: 3,
    })
    expect(canApproveContent(contentItem, approvedWorkflow)).toBe(true)
    expect(canApproveContent({ ...contentItem, storyRevision: 2 }, approvedWorkflow)).toBe(false)
    expect(canScheduleContent({ ...contentItem, status: 'approved' }, approvedWorkflow)).toBe(true)
    expect(canScheduleContent(contentItem, approvedWorkflow)).toBe(false)
  })

  it('validates every generated content draft before review', () => {
    expect(validateStoryContentDraft(contentItem)).toEqual([])
    expect(validateStoryContentDraft({ ...contentItem, body: '' })).toContain('Content body is required.')
  })

  it('creates stable workspace slugs', () => {
    expect(toStoryWorkspaceSlug('Kyoto / New Signal 02')).toBe('kyoto-new-signal-02')
  })
})
