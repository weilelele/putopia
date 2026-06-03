'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Vote, UserRole, VoteInsert, VoteResponseInsert } from '@/types/database'
import { getPostHogClient } from '@/lib/posthog-server'
import { logActivity } from './activity-events'

// Converts legacy single-string scope (pre-schema_v8) to UserRole[]
function normalizeScope(scope: unknown): UserRole[] {
  if (Array.isArray(scope)) return scope as UserRole[]
  switch (scope) {
    case 'public':
    case 'applicant': return ['applicant', 'voyager', 'architect']
    case 'voyager':   return ['voyager', 'architect']
    case 'architect': return ['architect']
    default:          return ['applicant', 'voyager', 'architect']
  }
}

// All votes visible to everyone (scope controls who can participate, not who can view)
export async function getAllVotes(): Promise<Vote[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('votes')
    .select('*')
    .order('created_at', { ascending: false })

  return (data ?? []).map((v) => ({ ...v, scope: normalizeScope(v.scope) })) as Vote[]
}

// Returns { [voteId]: { [optionId]: count } } for all provided vote IDs
export async function getVoteResultsBulk(voteIds: string[]): Promise<Record<string, Record<string, number>>> {
  if (voteIds.length === 0) return {}
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('vote_responses')
    .select('vote_id, selected_options')
    .in('vote_id', voteIds)

  if (!data) return {}

  const tallies: Record<string, Record<string, number>> = {}
  for (const row of data) {
    if (!tallies[row.vote_id]) tallies[row.vote_id] = {}
    for (const optId of (row.selected_options as string[])) {
      tallies[row.vote_id][optId] = (tallies[row.vote_id][optId] ?? 0) + 1
    }
  }
  return tallies
}

export async function createVote(vote: VoteInsert) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', data: null }

  const { data: profile } = await supabase
    .from('voyager_profiles')
    .select('display_name, role')
    .eq('id', user.id)
    .single()

  const { data, error } = await supabase
    .from('votes')
    .insert({ ...vote, created_by: user.id })
    .select()
    .single()

  if (error) return { error: error.message, data: null }
  revalidatePath('/vote')

  logActivity({
    actor_id:    user.id,
    actor_name:  profile?.display_name ?? 'Unknown',
    actor_role:  profile?.role ?? 'voyager',
    event_type:  'vote_opened',
    target_id:   data.id,
    target_title: vote.title,
    target_href: '/vote',
    group_key:   `vote-${data.id}`,
  })

  return { error: null, data }
}

export async function submitVoteResponse(response: Omit<VoteResponseInsert, 'user_id' | 'voter_name'>, anonToken?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch display_name + role + vote question in parallel
  let voterName: string | null = null
  let voterRole = 'voyager'
  let voteQuestion: string | null = null

  const fetches: Promise<void>[] = []

  if (user) {
    fetches.push(
      supabase.from('voyager_profiles').select('display_name, role').eq('id', user.id).single()
        .then(({ data: p }) => { voterName = p?.display_name ?? null; voterRole = p?.role ?? 'voyager' }) as Promise<void>
    )
  }
  fetches.push(
    supabase.from('votes').select('title').eq('id', response.vote_id).single()
      .then(({ data: v }) => { voteQuestion = (v as { title?: string } | null)?.title ?? null }) as Promise<void>
  )
  await Promise.all(fetches)

  const insert: VoteResponseInsert = {
    ...response,
    user_id: user?.id ?? null,
    anon_token: user ? null : (anonToken ?? null),
    voter_name: voterName,
  }

  const { error } = await supabase
    .from('vote_responses')
    .insert(insert)

  if (error) return { error: error.message }
  revalidatePath('/vote')

  if (user) {
    logActivity({
      actor_id:    user.id,
      actor_name:  voterName ?? 'Unknown',
      actor_role:  voterRole,
      event_type:  'vote_cast',
      target_id:   response.vote_id,
      target_title: voteQuestion ?? undefined,
      target_href: '/vote',
      vote_option: response.selected_options?.[0] ?? undefined,
      group_key:   `vote-${response.vote_id}`,
    })
  }

  const distinctId = user?.id ?? (anonToken ?? 'anonymous')
  const posthog = getPostHogClient()
  posthog.capture({ distinctId, event: 'vote_response_submitted', properties: { vote_id: response.vote_id, selected_options: response.selected_options } })
  await posthog.shutdown()
  return { error: null }
}

export async function getMyVoteResponses() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('vote_responses')
    .select('vote_id, selected_options')
    .eq('user_id', user.id)

  return data ?? []
}

export async function deleteVote(voteId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // vote_responses has ON DELETE CASCADE — deleting votes cascades automatically
  const { error } = await supabase.from('votes').delete().eq('id', voteId)
  if (error) return { error: error.message }
  revalidatePath('/vote')
  revalidatePath('/admin/votes')
  return { error: null }
}

export async function getVoteResults(voteId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('vote_responses')
    .select('selected_options')
    .eq('vote_id', voteId)

  if (!data) return {}

  const tally: Record<string, number> = {}
  for (const row of data) {
    for (const optId of row.selected_options) {
      tally[optId] = (tally[optId] ?? 0) + 1
    }
  }
  return tally
}
