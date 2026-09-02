import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'
import {
  STORY_AUTOMATIC_PUBLICATION_ENABLED,
  STORY_MANUAL_PUBLICATION_MESSAGE,
} from '@/lib/story-workflows'
import type {
  DeviceBatchStoryContentItemRow,
  DeviceBatchStoryWorkflowRow,
} from '@/types/database'
import type {
  StoryContentItem,
  StoryWorkflow,
} from '@/lib/story-workflows'

export type StoryWorkflowLoadResult = {
  workflows: StoryWorkflow[]
  setupRequired: boolean
  error: string | null
}

function mapContentItem(row: DeviceBatchStoryContentItemRow): StoryContentItem {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    position: row.position,
    title: row.title,
    channel: row.channel,
    contentType: row.content_type,
    body: row.body,
    narrativePurpose: row.narrative_purpose,
    facts: row.facts,
    requiredAssets: row.required_assets,
    recommendedPublishAt: row.recommended_publish_at,
    timingRationale: row.timing_rationale,
    dependencies: row.dependencies,
    followUp: row.follow_up,
    status: row.status,
    reviewNote: row.review_note,
    storyRevision: row.story_revision,
    version: row.version,
    scheduledFor: row.scheduled_for,
    approvedAt: row.approved_at,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapWorkflow(
  row: DeviceBatchStoryWorkflowRow,
  items: DeviceBatchStoryContentItemRow[],
): StoryWorkflow {
  return {
    id: row.id,
    workspaceSlug: row.workspace_slug,
    batchName: row.batch_name,
    location: row.location,
    sourceStory: row.source_story,
    sourceVersion: row.source_version,
    adaptation: row.adaptation,
    adaptationStatus: row.adaptation_status,
    adaptationRevision: row.adaptation_revision,
    adaptationApprovedRevision: row.adaptation_approved_revision,
    reviewNote: row.review_note,
    version: row.version,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    contentItems: items
      .filter((item) => item.workflow_id === row.id)
      .sort((a, b) => a.position - b.position)
      .map(mapContentItem),
  }
}

function isMissingStorySchema(message: string) {
  return message.includes('device_batch_story_workflows')
    && (message.includes('does not exist') || message.includes('schema cache'))
}

export async function listStoryWorkflows(): Promise<StoryWorkflowLoadResult> {
  const admin = createAdminClient()
  const [workflowResult, itemResult] = await Promise.all([
    admin
      .from('device_batch_story_workflows')
      .select('*')
      .order('updated_at', { ascending: false }),
    admin
      .from('device_batch_story_content_items')
      .select('*')
      .order('position', { ascending: true }),
  ])

  const error = workflowResult.error ?? itemResult.error
  if (error) {
    return {
      workflows: [],
      setupRequired: isMissingStorySchema(error.message),
      error: error.message,
    }
  }

  const workflows = (workflowResult.data ?? []) as DeviceBatchStoryWorkflowRow[]
  const items = (itemResult.data ?? []) as DeviceBatchStoryContentItemRow[]
  return {
    workflows: workflows.map((workflow) => mapWorkflow(workflow, items)),
    setupRequired: false,
    error: null,
  }
}

export async function getStoryWorkflow(id: string): Promise<StoryWorkflow | null> {
  const admin = createAdminClient()
  const [workflowResult, itemResult] = await Promise.all([
    admin
      .from('device_batch_story_workflows')
      .select('*')
      .eq('id', id)
      .maybeSingle(),
    admin
      .from('device_batch_story_content_items')
      .select('*')
      .eq('workflow_id', id)
      .order('position', { ascending: true }),
  ])
  if (workflowResult.error) throw workflowResult.error
  if (itemResult.error) throw itemResult.error
  if (!workflowResult.data) return null
  return mapWorkflow(
    workflowResult.data as DeviceBatchStoryWorkflowRow,
    (itemResult.data ?? []) as DeviceBatchStoryContentItemRow[],
  )
}

export async function publishStoryContentItem(input: {
  itemId: string
  publishedBy: string | null
  respectSchedule: boolean
  expectedVersion?: number
  now?: string
}) {
  if (!STORY_AUTOMATIC_PUBLICATION_ENABLED && (input.respectSchedule || !input.publishedBy)) {
    return { error: STORY_MANUAL_PUBLICATION_MESSAGE, published: false }
  }
  const admin = createAdminClient()
  const now = input.now ?? new Date().toISOString()
  const { data: item, error: itemError } = await admin
    .from('device_batch_story_content_items')
    .select('*')
    .eq('id', input.itemId)
    .maybeSingle()
  if (itemError) return { error: itemError.message, published: false }
  if (!item) return { error: 'Content item not found.', published: false }

  const typedItem = item as DeviceBatchStoryContentItemRow
  if (typedItem.status === 'published') {
    return { error: null, published: false }
  }
  if (input.expectedVersion !== undefined && typedItem.version !== input.expectedVersion) {
    return { error: 'This content item changed in another session. Reload before publishing.', published: false }
  }
  if (!['approved', 'scheduled'].includes(typedItem.status)) {
    return { error: 'Only approved content can be published.', published: false }
  }
  if (
    input.respectSchedule
    && (!typedItem.scheduled_for || typedItem.scheduled_for > now)
  ) {
    return { error: null, published: false }
  }

  const { data: workflow, error: workflowError } = await admin
    .from('device_batch_story_workflows')
    .select('batch_name, adaptation_status, adaptation_approved_revision')
    .eq('id', typedItem.workflow_id)
    .maybeSingle()
  if (workflowError) return { error: workflowError.message, published: false }
  if (!workflow) return { error: 'Story workflow not found.', published: false }
  if (
    workflow.adaptation_status !== 'approved'
    || workflow.adaptation_approved_revision !== typedItem.story_revision
  ) {
    return {
      error: 'The source adaptation changed. This item requires re-review.',
      published: false,
    }
  }

  const { error: publicationError } = await admin
    .from('story_publications')
    .upsert({
      source_item_id: typedItem.id,
      workflow_id: typedItem.workflow_id,
      batch_name: workflow.batch_name,
      title: typedItem.title,
      channel: typedItem.channel,
      content_type: typedItem.content_type,
      body: typedItem.body,
      context: {
        dependencies: typedItem.dependencies,
        facts: typedItem.facts,
        followUp: typedItem.follow_up,
        narrativePurpose: typedItem.narrative_purpose,
        requiredAssets: typedItem.required_assets,
        timingRationale: typedItem.timing_rationale,
      },
      scheduled_for: typedItem.scheduled_for,
      published_by: input.publishedBy,
      published_at: now,
    }, {
      ignoreDuplicates: true,
      onConflict: 'source_item_id',
    })
  if (publicationError) return { error: publicationError.message, published: false }

  const { data: updated, error: updateError } = await admin
    .from('device_batch_story_content_items')
    .update({
      status: 'published',
      published_by: input.publishedBy,
      published_at: now,
      updated_at: now,
      version: typedItem.version + 1,
    })
    .eq('id', typedItem.id)
    .eq('version', typedItem.version)
    .neq('status', 'published')
    .select('id')
    .maybeSingle()
  if (updateError) return { error: updateError.message, published: false }
  return { error: null, published: Boolean(updated) }
}

export async function publishDueStoryContent(now = new Date().toISOString()) {
  if (!STORY_AUTOMATIC_PUBLICATION_ENABLED) {
    return { errors: [], published: 0, checked: 0, skipped: 'manual_publication_mode' }
  }
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('device_batch_story_content_items')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true })
    .limit(50)
  if (error) return { errors: [error.message], published: 0, checked: 0 }

  const errors: string[] = []
  let published = 0
  for (const row of data ?? []) {
    const result = await publishStoryContentItem({
      itemId: row.id,
      publishedBy: null,
      respectSchedule: true,
      now,
    })
    if (result.error) errors.push(`${row.id}: ${result.error}`)
    if (result.published) published += 1
  }
  return { errors, published, checked: data?.length ?? 0 }
}
