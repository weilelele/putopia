'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getStoryWorkflow, publishStoryContentItem } from '@/lib/story-workflow-repository'
import {
  canApproveAdaptation,
  canApproveContent,
  canScheduleContent,
  validateStoryAdaptation,
  validateStoryContentDraft,
  validateStoryWorkflowDraft,
  type StoryAdaptation,
  type StoryContentDraft,
  type StoryReviewStatus,
  type StoryWorkflowDraft,
} from '@/lib/story-workflows'

type ActionResult = {
  error: string | null
  workflowId?: string
}

async function requireArchitect() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('voyager_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  return profile?.role === 'architect' ? user : null
}

function refreshStoryLab() {
  revalidatePath('/admin/device-batches/blueprints')
}

function cleanLines(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean)
}

function normalizeAdaptation(value: StoryAdaptation): StoryAdaptation {
  return {
    core: value.core.map((item) => ({
      label: item.label.trim(),
      value: item.value.trim(),
    })),
    storyEngine: value.storyEngine.trim(),
    confirmed: cleanLines(value.confirmed),
    estimates: cleanLines(value.estimates),
    unresolved: cleanLines(value.unresolved),
    phases: value.phases.map((phase) => ({
      number: phase.number.trim(),
      label: phase.label.trim(),
      purpose: phase.purpose.trim(),
      beats: cleanLines(phase.beats),
      gate: phase.gate.trim(),
    })),
    votes: value.votes.map((vote) => ({
      question: vote.question.trim(),
      whyNow: vote.whyNow.trim(),
      options: cleanLines(vote.options),
      fixed: vote.fixed.trim(),
      result: vote.result.trim(),
    })),
    atmosphere: cleanLines(value.atmosphere),
    boundaries: cleanLines(value.boundaries),
    nextQuestions: cleanLines(value.nextQuestions),
  }
}

function normalizeContentDraft(value: StoryContentDraft): StoryContentDraft {
  return {
    ...value,
    title: value.title.trim(),
    channel: value.channel.trim(),
    contentType: value.contentType.trim(),
    body: value.body.trim(),
    narrativePurpose: value.narrativePurpose.trim(),
    facts: cleanLines(value.facts),
    requiredAssets: cleanLines(value.requiredAssets),
    timingRationale: value.timingRationale.trim(),
    dependencies: cleanLines(value.dependencies),
    followUp: value.followUp.trim(),
  }
}

export async function createStoryWorkflow(
  input: StoryWorkflowDraft,
): Promise<ActionResult> {
  const user = await requireArchitect()
  if (!user) return { error: 'Forbidden' }
  const normalized = {
    batchName: input.batchName.trim(),
    location: input.location.trim(),
    sourceStory: input.sourceStory.trim(),
    workspaceSlug: input.workspaceSlug.trim(),
  }
  const [error] = validateStoryWorkflowDraft(normalized)
  if (error) return { error }

  const admin = createAdminClient()
  const { data, error: insertError } = await admin
    .from('device_batch_story_workflows')
    .insert({
      workspace_slug: normalized.workspaceSlug,
      batch_name: normalized.batchName,
      location: normalized.location,
      source_story: normalized.sourceStory,
      source_version: 1,
      adaptation: null,
      adaptation_status: 'draft',
      adaptation_revision: 0,
      adaptation_approved_revision: null,
      review_note: '',
      version: 1,
      created_by: user.id,
      updated_by: user.id,
      approved_by: null,
    })
    .select('id')
    .single()
  if (insertError) {
    if (insertError.code === '23505') return { error: 'This workspace slug is already in use.' }
    return { error: insertError.message }
  }
  refreshStoryLab()
  return { error: null, workflowId: data.id }
}

export async function saveStorySource(input: {
  workflowId: string
  batchName: string
  location: string
  sourceStory: string
  expectedVersion: number
}): Promise<ActionResult> {
  const user = await requireArchitect()
  if (!user) return { error: 'Forbidden' }
  const workflow = await getStoryWorkflow(input.workflowId)
  if (!workflow) return { error: 'Story workspace not found.' }
  if (workflow.version !== input.expectedVersion) {
    return { error: 'This story changed in another session. Reload before saving.' }
  }

  const draft = {
    workspaceSlug: workflow.workspaceSlug,
    batchName: input.batchName.trim(),
    location: input.location.trim(),
    sourceStory: input.sourceStory.trim(),
  }
  const [validationError] = validateStoryWorkflowDraft(draft)
  if (validationError) return { error: validationError }
  const storyChanged = workflow.sourceStory !== draft.sourceStory
  const identityChanged = workflow.batchName !== draft.batchName || workflow.location !== draft.location
  if (!storyChanged && !identityChanged) return { error: null, workflowId: workflow.id }

  const now = new Date().toISOString()
  const nextRevision = storyChanged ? workflow.adaptationRevision + 1 : workflow.adaptationRevision
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('device_batch_story_workflows')
    .update({
      batch_name: draft.batchName,
      location: draft.location,
      source_story: draft.sourceStory,
      source_version: storyChanged ? workflow.sourceVersion + 1 : workflow.sourceVersion,
      adaptation: storyChanged ? null : workflow.adaptation,
      adaptation_status: storyChanged ? 'draft' : workflow.adaptationStatus,
      adaptation_revision: nextRevision,
      adaptation_approved_revision: storyChanged ? null : workflow.adaptationApprovedRevision,
      approved_at: storyChanged ? null : workflow.approvedAt,
      ...(storyChanged ? { approved_by: null } : {}),
      review_note: storyChanged ? '' : workflow.reviewNote,
      updated_at: now,
      updated_by: user.id,
      version: workflow.version + 1,
    })
    .eq('id', workflow.id)
    .eq('version', workflow.version)
    .select('id')
    .maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: 'Story revision conflict. Reload and try again.' }

  refreshStoryLab()
  return { error: null, workflowId: workflow.id }
}

export async function saveStoryAdaptation(input: {
  workflowId: string
  adaptation: StoryAdaptation
  reviewNote: string
  expectedVersion: number
}): Promise<ActionResult> {
  const user = await requireArchitect()
  if (!user) return { error: 'Forbidden' }
  const workflow = await getStoryWorkflow(input.workflowId)
  if (!workflow) return { error: 'Story workspace not found.' }
  if (workflow.version !== input.expectedVersion) {
    return { error: 'This adaptation changed in another session. Reload before saving.' }
  }
  const adaptation = normalizeAdaptation(input.adaptation)
  const [validationError] = validateStoryAdaptation(adaptation)
  if (validationError) return { error: validationError }

  const now = new Date().toISOString()
  const nextRevision = workflow.adaptationRevision + 1
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('device_batch_story_workflows')
    .update({
      adaptation,
      adaptation_status: 'draft',
      adaptation_revision: nextRevision,
      adaptation_approved_revision: null,
      approved_at: null,
      approved_by: null,
      review_note: input.reviewNote.trim(),
      updated_at: now,
      updated_by: user.id,
      version: workflow.version + 1,
    })
    .eq('id', workflow.id)
    .eq('version', workflow.version)
    .select('id')
    .maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: 'Adaptation revision conflict. Reload and try again.' }

  refreshStoryLab()
  return { error: null, workflowId: workflow.id }
}

export async function reviewStoryAdaptation(input: {
  workflowId: string
  action: 'submit' | 'request_changes' | 'approve'
  reviewNote: string
  expectedVersion: number
}): Promise<ActionResult> {
  const user = await requireArchitect()
  if (!user) return { error: 'Forbidden' }
  const workflow = await getStoryWorkflow(input.workflowId)
  if (!workflow) return { error: 'Story workspace not found.' }
  if (workflow.version !== input.expectedVersion) {
    return { error: 'This adaptation changed in another session. Reload before reviewing.' }
  }
  if (!workflow.adaptation) return { error: 'Generate or save an adaptation before review.' }

  let status: StoryReviewStatus
  if (input.action === 'submit') {
    if (!['draft', 'changes_requested'].includes(workflow.adaptationStatus)) {
      return { error: 'Only a draft or changes-requested adaptation can enter review.' }
    }
    status = 'in_review'
  } else if (input.action === 'request_changes') {
    if (workflow.adaptationStatus !== 'in_review') {
      return { error: 'Only an adaptation in review can receive change requests.' }
    }
    if (!input.reviewNote.trim()) return { error: 'Add a review note before requesting changes.' }
    status = 'changes_requested'
  } else {
    if (!canApproveAdaptation(workflow)) {
      return { error: 'Only a complete adaptation in review can be approved.' }
    }
    status = 'approved'
  }

  const now = new Date().toISOString()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('device_batch_story_workflows')
    .update({
      adaptation_status: status,
      adaptation_approved_revision: status === 'approved' ? workflow.adaptationRevision : null,
      approved_at: status === 'approved' ? now : null,
      approved_by: status === 'approved' ? user.id : null,
      review_note: input.reviewNote.trim(),
      updated_at: now,
      updated_by: user.id,
      version: workflow.version + 1,
    })
    .eq('id', workflow.id)
    .eq('version', workflow.version)
    .select('id')
    .maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: 'Adaptation revision conflict. Reload and try again.' }
  refreshStoryLab()
  return { error: null, workflowId: workflow.id }
}

export async function saveStoryContentItem(input: {
  itemId: string
  draft: StoryContentDraft
  reviewNote: string
  expectedVersion: number
}): Promise<ActionResult> {
  const user = await requireArchitect()
  if (!user) return { error: 'Forbidden' }
  const admin = createAdminClient()
  const { data: current, error: readError } = await admin
    .from('device_batch_story_content_items')
    .select('*')
    .eq('id', input.itemId)
    .maybeSingle()
  if (readError) return { error: readError.message }
  if (!current) return { error: 'Content item not found.' }
  if (current.version !== input.expectedVersion) {
    return { error: 'This content item changed in another session. Reload before saving.' }
  }
  if (current.status === 'published') return { error: 'Published content is immutable.' }

  const workflow = await getStoryWorkflow(current.workflow_id)
  if (!workflow) return { error: 'Story workspace not found.' }
  if (workflow.adaptationStatus !== 'approved' || !workflow.adaptationApprovedRevision) {
    return { error: 'Approve the current story adaptation before editing content.' }
  }

  const draft = normalizeContentDraft(input.draft)
  const [validationError] = validateStoryContentDraft(draft)
  if (validationError) return { error: validationError }
  const now = new Date().toISOString()
  const { data, error } = await admin
    .from('device_batch_story_content_items')
    .update({
      position: draft.position,
      title: draft.title,
      channel: draft.channel,
      content_type: draft.contentType,
      body: draft.body,
      narrative_purpose: draft.narrativePurpose,
      facts: draft.facts,
      required_assets: draft.requiredAssets,
      recommended_publish_at: draft.recommendedPublishAt,
      timing_rationale: draft.timingRationale,
      dependencies: draft.dependencies,
      follow_up: draft.followUp,
      status: 'draft',
      review_note: input.reviewNote.trim(),
      story_revision: workflow.adaptationApprovedRevision,
      version: current.version + 1,
      scheduled_for: null,
      approved_at: null,
      approved_by: null,
      updated_at: now,
    })
    .eq('id', current.id)
    .eq('version', current.version)
    .select('workflow_id')
    .maybeSingle()
  if (error) {
    if (error.code === '23505') return { error: 'Another content item already uses this position.' }
    return { error: error.message }
  }
  if (!data) return { error: 'Content revision conflict. Reload and try again.' }
  refreshStoryLab()
  return { error: null, workflowId: data.workflow_id }
}

export async function reviewStoryContentItem(input: {
  itemId: string
  action: 'submit' | 'request_changes' | 'approve'
  reviewNote: string
  expectedVersion: number
}): Promise<ActionResult> {
  const user = await requireArchitect()
  if (!user) return { error: 'Forbidden' }
  const admin = createAdminClient()
  const { data: current, error: readError } = await admin
    .from('device_batch_story_content_items')
    .select('*')
    .eq('id', input.itemId)
    .maybeSingle()
  if (readError) return { error: readError.message }
  if (!current) return { error: 'Content item not found.' }
  if (current.version !== input.expectedVersion) {
    return { error: 'This content item changed in another session. Reload before reviewing.' }
  }
  const workflow = await getStoryWorkflow(current.workflow_id)
  if (!workflow) return { error: 'Story workspace not found.' }

  let status: 'in_review' | 'changes_requested' | 'approved'
  if (input.action === 'submit') {
    if (!['draft', 'changes_requested'].includes(current.status)) {
      return { error: 'Only a draft or changes-requested item can enter review.' }
    }
    if (current.story_revision !== workflow.adaptationApprovedRevision) {
      return { error: 'Save this item against the latest approved story before review.' }
    }
    status = 'in_review'
  } else if (input.action === 'request_changes') {
    if (current.status !== 'in_review') {
      return { error: 'Only content in review can receive change requests.' }
    }
    if (!input.reviewNote.trim()) return { error: 'Add a review note before requesting changes.' }
    status = 'changes_requested'
  } else {
    const mappedItem = workflow.contentItems.find((item) => item.id === current.id)
    if (!mappedItem || !canApproveContent(mappedItem, workflow)) {
      return { error: 'Only current content in review can be approved.' }
    }
    status = 'approved'
  }

  const now = new Date().toISOString()
  const { data, error } = await admin
    .from('device_batch_story_content_items')
    .update({
      status,
      review_note: input.reviewNote.trim(),
      approved_at: status === 'approved' ? now : null,
      approved_by: status === 'approved' ? user.id : null,
      updated_at: now,
      version: current.version + 1,
    })
    .eq('id', current.id)
    .eq('version', current.version)
    .select('workflow_id')
    .maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: 'Content revision conflict. Reload and try again.' }
  refreshStoryLab()
  return { error: null, workflowId: data.workflow_id }
}

export async function scheduleStoryContentItem(input: {
  itemId: string
  scheduledFor: string
  expectedVersion: number
}): Promise<ActionResult> {
  const user = await requireArchitect()
  if (!user) return { error: 'Forbidden' }
  const scheduledFor = new Date(input.scheduledFor)
  if (Number.isNaN(scheduledFor.getTime())) return { error: 'Choose a valid publishing date and time.' }
  if (scheduledFor.getTime() <= Date.now()) {
    return { error: 'Scheduled publishing must be in the future. Use Publish now for immediate release.' }
  }

  const admin = createAdminClient()
  const { data: current, error: readError } = await admin
    .from('device_batch_story_content_items')
    .select('*')
    .eq('id', input.itemId)
    .maybeSingle()
  if (readError) return { error: readError.message }
  if (!current) return { error: 'Content item not found.' }
  if (current.version !== input.expectedVersion) {
    return { error: 'This content item changed in another session. Reload before scheduling.' }
  }
  const workflow = await getStoryWorkflow(current.workflow_id)
  const mappedItem = workflow?.contentItems.find((item) => item.id === current.id)
  if (!workflow || !mappedItem || !canScheduleContent(mappedItem, workflow)) {
    return { error: 'Only approved content based on the current story can be scheduled.' }
  }

  const { data, error } = await admin
    .from('device_batch_story_content_items')
    .update({
      status: 'scheduled',
      scheduled_for: scheduledFor.toISOString(),
      updated_at: new Date().toISOString(),
      version: current.version + 1,
    })
    .eq('id', current.id)
    .eq('version', current.version)
    .select('workflow_id')
    .maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: 'Content revision conflict. Reload and try again.' }
  refreshStoryLab()
  return { error: null, workflowId: data.workflow_id }
}

export async function publishStoryContentNow(input: {
  itemId: string
}): Promise<ActionResult> {
  const user = await requireArchitect()
  if (!user) return { error: 'Forbidden' }
  const result = await publishStoryContentItem({
    itemId: input.itemId,
    publishedBy: user.id,
    respectSchedule: false,
  })
  if (result.error) return { error: result.error }
  refreshStoryLab()
  return { error: null }
}
