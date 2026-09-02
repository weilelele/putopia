export type StoryReviewStatus =
  | 'draft'
  | 'in_review'
  | 'changes_requested'
  | 'approved'

export type StoryContentStatus =
  | StoryReviewStatus
  | 'scheduled'
  | 'published'
  | 'needs_re_review'

// Temporary operator-led release mode. Re-enabling this requires a scheduler
// and restoring the scheduling controls and cron configuration together.
export const STORY_AUTOMATIC_PUBLICATION_ENABLED = false
export const STORY_MANUAL_PUBLICATION_MESSAGE =
  'Automatic publication is paused. Publish the Batch update manually, then record the publication in Story Lab.'

export type StoryCoreItem = {
  label: string
  value: string
}

export type StoryPhase = {
  number: string
  label: string
  purpose: string
  beats: string[]
  gate: string
}

export type StoryVote = {
  question: string
  whyNow: string
  options: string[]
  fixed: string
  result: string
}

export type StoryAdaptation = {
  core: StoryCoreItem[]
  storyEngine: string
  confirmed: string[]
  estimates: string[]
  unresolved: string[]
  phases: StoryPhase[]
  votes: StoryVote[]
  atmosphere: string[]
  boundaries: string[]
  nextQuestions: string[]
}

export type StoryContentItem = {
  id: string
  workflowId: string
  position: number
  title: string
  channel: string
  contentType: string
  body: string
  narrativePurpose: string
  facts: string[]
  requiredAssets: string[]
  recommendedPublishAt: string | null
  timingRationale: string
  dependencies: string[]
  followUp: string
  status: StoryContentStatus
  reviewNote: string
  storyRevision: number
  version: number
  scheduledFor: string | null
  approvedAt: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export type StoryWorkflow = {
  id: string
  workspaceSlug: string
  batchName: string
  location: string
  sourceStory: string
  sourceVersion: number
  adaptation: StoryAdaptation | null
  adaptationStatus: StoryReviewStatus
  adaptationRevision: number
  adaptationApprovedRevision: number | null
  reviewNote: string
  version: number
  approvedAt: string | null
  createdAt: string
  updatedAt: string
  contentItems: StoryContentItem[]
}

export type StoryWorkflowDraft = Pick<
  StoryWorkflow,
  'batchName' | 'location' | 'sourceStory' | 'workspaceSlug'
>

export type StoryContentDraft = Pick<
  StoryContentItem,
  | 'body'
  | 'channel'
  | 'contentType'
  | 'dependencies'
  | 'facts'
  | 'followUp'
  | 'narrativePurpose'
  | 'position'
  | 'recommendedPublishAt'
  | 'requiredAssets'
  | 'timingRationale'
  | 'title'
>

export const STORY_REVIEW_LABELS: Record<StoryReviewStatus, string> = {
  draft: 'DRAFT',
  in_review: 'IN REVIEW',
  changes_requested: 'CHANGES REQUESTED',
  approved: 'APPROVED',
}

export const STORY_CONTENT_LABELS: Record<StoryContentStatus, string> = {
  ...STORY_REVIEW_LABELS,
  scheduled: 'AWAITING MANUAL RELEASE',
  published: 'PUBLISHED',
  needs_re_review: 'NEEDS RE-REVIEW',
}

export function toStoryWorkspaceSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function hasTextList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(hasText)
}

export function validateStoryWorkflowDraft(draft: StoryWorkflowDraft) {
  const errors: string[] = []
  if (!hasText(draft.batchName)) errors.push('Batch name is required.')
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.workspaceSlug)) {
    errors.push('Workspace slug must contain lowercase letters, numbers, and hyphens only.')
  }
  const length = draft.sourceStory.trim().length
  if (length < 20 || length > 20_000) {
    errors.push('The source story must contain between 20 and 20,000 characters.')
  }
  return errors
}

export function validateStoryAdaptation(value: StoryAdaptation) {
  const errors: string[] = []
  if (value.core.length !== 4 || value.core.some((item) => !hasText(item.label) || !hasText(item.value))) {
    errors.push('The adaptation must contain four complete core fields.')
  }
  if (!hasText(value.storyEngine)) errors.push('Story engine is required.')
  if (!hasTextList(value.confirmed)) errors.push('At least one confirmed fact is required.')
  if (!hasTextList(value.unresolved)) errors.push('At least one unresolved question is required.')
  if (value.phases.length !== 4) errors.push('The adaptation must contain four phases.')
  if (value.phases.some((phase) => (
    !hasText(phase.number)
    || !hasText(phase.label)
    || !hasText(phase.purpose)
    || !hasText(phase.gate)
    || phase.beats.length < 1
    || phase.beats.length > 3
    || phase.beats.some((beat) => !hasText(beat))
  ))) {
    errors.push('Every phase needs a label, purpose, one to three beats, and a gate.')
  }
  if (value.votes.length > 1) errors.push('The adaptation may contain at most one vote.')
  return errors
}

export function validateStoryContentDraft(draft: StoryContentDraft) {
  const errors: string[] = []
  if (draft.position < 1) errors.push('Content position must be greater than zero.')
  if (!hasText(draft.title)) errors.push('Content title is required.')
  if (!hasText(draft.channel)) errors.push('Content channel is required.')
  if (!hasText(draft.contentType)) errors.push('Content type is required.')
  if (!hasText(draft.body)) errors.push('Content body is required.')
  if (!hasText(draft.narrativePurpose)) errors.push('Narrative purpose is required.')
  if (!hasText(draft.timingRationale)) errors.push('Timing rationale is required.')
  return errors
}

export function canApproveAdaptation(workflow: StoryWorkflow) {
  return Boolean(workflow.adaptation)
    && workflow.adaptationStatus === 'in_review'
    && validateStoryAdaptation(workflow.adaptation!).length === 0
}

export function canApproveContent(item: StoryContentItem, workflow: StoryWorkflow) {
  return workflow.adaptationStatus === 'approved'
    && item.storyRevision === workflow.adaptationApprovedRevision
    && item.status === 'in_review'
}

export function canScheduleContent(item: StoryContentItem, workflow: StoryWorkflow) {
  return STORY_AUTOMATIC_PUBLICATION_ENABLED
    && workflow.adaptationStatus === 'approved'
    && item.storyRevision === workflow.adaptationApprovedRevision
    && item.status === 'approved'
}

export function canPublishContent(item: StoryContentItem, workflow: StoryWorkflow) {
  return workflow.adaptationStatus === 'approved'
    && item.storyRevision === workflow.adaptationApprovedRevision
    && ['approved', 'scheduled'].includes(item.status)
}
