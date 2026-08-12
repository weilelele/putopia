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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'MC'
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

  // Server-side holder verification is authoritative; the admin write allows a
  // holder to revise their response until the decision closes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('vote_responses') as any)
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
  batchSlug: string,
): Promise<{ canPost: boolean; posts: DeviceBatchDiscussionPost[] }> {
  const admin = createAdminClient()
  const viewer = await getViewer(batchSlug)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (admin.from('comments') as any)
    .select('id, created_at, author_name, body, parent_id, image_paths, author_id')
    .eq('subject_type', 'device_batch')
    .eq('subject_id', batchSlug)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(400)

  const authorIds = [...new Set((rows ?? []).map((row: { author_id: string | null }) => row.author_id).filter(Boolean))]
  const { data: profiles } = authorIds.length
    ? await admin.from('voyager_profiles').select('id, display_name, role').in('id', authorIds as string[])
    : { data: [] }
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const replyCounts = new Map<string, number>()
  for (const row of rows ?? []) {
    if (row.parent_id) replyCounts.set(row.parent_id, (replyCounts.get(row.parent_id) ?? 0) + 1)
  }

  const posts = (rows ?? [])
    .filter((row: { parent_id: string | null }) => !row.parent_id)
    .map((row: {
      author_id: string | null
      author_name: string
      body: string
      created_at: string
      id: string
      image_paths: string[] | null
    }) => {
      const profile = row.author_id ? profileById.get(row.author_id) : null
      const author = profile?.display_name ?? row.author_name
      return {
        author,
        body: row.body,
        id: row.id,
        imageSources: row.image_paths ?? [],
        initials: initials(author),
        replyCount: replyCounts.get(row.id) ?? 0,
        role: profile?.role === 'architect' ? 'ARCHITECT' : 'HOLDER',
        timestamp: row.created_at,
      }
    })

  return { canPost: !!viewer?.canParticipate, posts }
}

export async function postDeviceBatchDiscussion(
  batchSlug: string,
  body: string,
  imagePaths: string[] = [],
): Promise<{ error: string | null; post: DeviceBatchDiscussionPost | null }> {
  const viewer = await getViewer(batchSlug)
  if (!viewer) return { error: 'Sign in to post.', post: null }
  if (!viewer.canParticipate) {
    return { error: 'Only confirmed holders can post to this Batch.', post: null }
  }
  const text = body.trim()
  if (!text && imagePaths.length === 0) {
    return { error: 'Write a message or attach an image.', post: null }
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.from('comments') as any)
    .insert({
      subject_type: 'device_batch',
      subject_id: batchSlug,
      author_id: viewer.userId,
      author_name: viewer.displayName,
      author_avatar_url: null,
      body: text || 'Shared an image with this Batch.',
      image_paths: imagePaths.slice(0, 3),
    })
    .select('id, created_at, body, image_paths')
    .single()
  if (error || !data) return { error: error?.message ?? 'Could not post message.', post: null }

  revalidatePath(`/devices/batches/${batchSlug}`)
  revalidatePath(`/devices/batches/${batchSlug}/discussion`)
  return {
    error: null,
    post: {
      author: viewer.displayName,
      body: data.body,
      id: data.id,
      imageSources: data.image_paths ?? [],
      initials: initials(viewer.displayName),
      replyCount: 0,
      role: viewer.role === 'architect' ? 'ARCHITECT' : 'HOLDER',
      timestamp: data.created_at,
    },
  }
}
