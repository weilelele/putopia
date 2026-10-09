'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export type DeviceBatchDecisionOption = {
  detail: string
  id: string
  label: string
  votes: number
}

export type DeviceBatchDecision = {
  canVote: boolean
  closesAt: string | null
  id: string
  options: DeviceBatchDecisionOption[]
  selectedOption: string | null
  summary: string
  title: string
}

export type DeviceBatchDiscussionPost = {
  author: string
  body: string
  id: string
  imageSources: string[]
  initials: string
  mine: boolean
  replyCount: number
  role: string
  timestamp: string
}

type Viewer = {
  canParticipate: boolean
  displayName: string
  role: string
  userId: string
}

export type DeviceBatchDecisionAdminOption = {
  code: string
  name: string
  slug: string
}

async function getViewer(batchSlug: string): Promise<Viewer | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const [{ data: profile }, { data: unit }] = await Promise.all([
    admin
      .from('voyager_profiles')
      .select('display_name, role')
      .eq('id', user.id)
      .maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.from('device_batch_units') as any)
      .select('id')
      .eq('batch_slug', batchSlug)
      .eq('user_id', user.id)
      .in('status', ['assigned', 'preparing', 'shipped', 'delivered', 'return_pending'])
      .limit(1)
      .maybeSingle(),
  ])

  return {
    canParticipate: profile?.role === 'architect' || !!unit,
    displayName: profile?.display_name ?? user.email ?? 'Voyager',
    role: profile?.role ?? 'applicant',
    userId: user.id,
  }
}

export async function getDeviceBatchDecision(
  batchSlug: string,
): Promise<DeviceBatchDecision | null> {
  const admin = createAdminClient()
  const viewer = await getViewer(batchSlug)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vote } = await (admin.from('votes') as any)
    .select('id, title, description, options, ends_at, is_active')
    .eq('device_batch_slug', batchSlug)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!vote) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: responses } = await (admin.from('vote_responses') as any)
    .select('user_id, selected_options')
    .eq('vote_id', vote.id)

  const tallies = new Map<string, number>()
  let selectedOption: string | null = null
  for (const response of responses ?? []) {
    for (const optionId of response.selected_options as string[]) {
      tallies.set(optionId, (tallies.get(optionId) ?? 0) + 1)
    }
    if (viewer && response.user_id === viewer.userId) {
      selectedOption = (response.selected_options as string[])[0] ?? null
    }
  }

  const endsAt = vote.ends_at as string | null
  const isOpen = !endsAt || new Date(endsAt).getTime() > Date.now()
  const options = Array.isArray(vote.options) ? vote.options : []

  return {
    canVote: !!viewer?.canParticipate && isOpen,
    closesAt: endsAt,
    id: vote.id,
    options: options.map((option: { detail?: string; id: string; label: string }) => ({
      detail: option.detail ?? '',
      id: option.id,
      label: option.label,
      votes: tallies.get(option.id) ?? 0,
    })),
    selectedOption,
    summary: vote.description ?? '',
    title: vote.title,
  }
}

export async function castDeviceBatchVote(
  batchSlug: string,
  voteId: string,
  optionId: string,
): Promise<{ error: string | null }> {
  const viewer = await getViewer(batchSlug)
  if (!viewer) return { error: 'Sign in to vote.' }
  if (!viewer.canParticipate) return { error: 'Only confirmed holders can vote in this Batch.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vote } = await (admin.from('votes') as any)
    .select('id, options, ends_at, is_active')
    .eq('id', voteId)
    .eq('device_batch_slug', batchSlug)
    .maybeSingle()
  if (!vote || !vote.is_active) return { error: 'This decision is no longer active.' }
  if (vote.ends_at && new Date(vote.ends_at).getTime() <= Date.now()) {
    return { error: 'This decision has closed.' }
  }
  const options = Array.isArray(vote.options) ? vote.options : []
  if (!options.some((option: { id?: string }) => option.id === optionId)) {
    return { error: 'Choose a valid option.' }
  }

  // Keep the verified JWT on the write so DB scope/holder/ownership checks apply.
  // The narrow batch-response UPDATE policy permits revisions before closing.
  const client = await createClient()
  const { error } = await client.from('vote_responses')
    .upsert({
      vote_id: voteId,
      user_id: viewer.userId,
      anon_token: null,
      selected_options: [optionId],
      voter_name: viewer.displayName,
    }, { onConflict: 'vote_id,user_id' })
  if (error) return { error: error.message }

  revalidatePath(`/devices/batches/${batchSlug}`)
  return { error: null }
}

export async function listDeviceBatchDecisionAdminOptions(): Promise<DeviceBatchDecisionAdminOption[]> {
  const viewer = await getViewer('')
  if (viewer?.role !== 'architect') return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('device_batches')
    .select('slug, code, name')
    .eq('publication_status', 'published')
    .order('updated_at', { ascending: false })
  return (data ?? []) as DeviceBatchDecisionAdminOption[]
}

export async function createDeviceBatchDecision(params: {
  batchSlug: string
  closesAt: string
  options: string[]
  summary: string
  title: string
}): Promise<{ error: string | null }> {
  const viewer = await getViewer(params.batchSlug)
  if (viewer?.role !== 'architect') return { error: 'Architect permission required.' }
  const title = params.title.trim()
  const summary = params.summary.trim()
  const labels = params.options.map((option) => option.trim()).filter(Boolean)
  const closesAt = new Date(params.closesAt)
  if (!title || !summary) return { error: 'Add a title and summary.' }
  if (labels.length < 2 || labels.length > 10) return { error: 'Add between 2 and 10 options.' }
  if (Number.isNaN(closesAt.getTime()) || closesAt.getTime() <= Date.now()) {
    return { error: 'Choose a future closing time.' }
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('votes') as any).insert({
    title,
    description: summary,
    type: 'single',
    scope: ['voyager', 'architect'],
    options: labels.map((label, index) => ({ id: `option-${index + 1}`, label, detail: '' })),
    is_active: true,
    created_by: viewer.userId,
    ends_at: closesAt.toISOString(),
    device_batch_slug: params.batchSlug,
  })
  if (error) {
    return {
      error: error.code === '23505'
        ? 'This Batch already has an active holder decision.'
        : error.message,
    }
  }
  revalidatePath('/admin/votes')
  revalidatePath(`/devices/batches/${params.batchSlug}`)
  return { error: null }
}

export async function closeDeviceBatchDecision(
  voteId: string,
  batchSlug: string,
): Promise<{ error: string | null }> {
  const viewer = await getViewer(batchSlug)
  if (viewer?.role !== 'architect') return { error: 'Architect permission required.' }
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('votes') as any)
    .update({ is_active: false })
    .eq('id', voteId)
    .eq('device_batch_slug', batchSlug)
  if (error) return { error: error.message }
  revalidatePath('/admin/votes')
  revalidatePath(`/devices/batches/${batchSlug}`)
  return { error: null }
}

export async function getDeviceBatchDiscussion(
  _batchSlug: string,
): Promise<{ canPost: boolean; posts: DeviceBatchDiscussionPost[] }> {
  void _batchSlug // Retain the old action signature for cached clients.
  return { canPost: false, posts: [] }
}

export async function postDeviceBatchDiscussion(
  _batchSlug: string,
  _body: string,
  _imagePaths?: string[],
): Promise<{ error: string | null; post: DeviceBatchDiscussionPost | null }> {
  void [_batchSlug, _body, _imagePaths] // Reject cached clients without reading or writing data.
  return { error: 'Device Discussion has closed. Existing records are preserved.', post: null }
}
