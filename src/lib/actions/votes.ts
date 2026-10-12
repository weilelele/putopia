'use server'

import { revalidatePath, unstable_cache } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Vote, VoteInsert, VoteResponseInsert } from '@/types/database'
import { getPostHogClient } from '@/lib/posthog-server'
import { normalizeVoteScope, voteSubmissionError, validAnonymousVoteToken } from '@/lib/digital-access'
import { getMyDigitalAccessRole } from './digital-access'
import { logActivity } from './activity-events'

// All votes visible to everyone (scope controls who can participate, not who can view)
// Cached 30 s — the vote list is identical for every viewer and loads on the console.
const getAllVotesCached = unstable_cache(
  async (): Promise<Vote[]> => {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw new Error('Votes could not be loaded')
    return (data ?? []).map((v) => ({ ...v, scope: normalizeVoteScope(v.scope) })) as Vote[]
  },
  ['all-votes'],
  { revalidate: 30 },
)

export async function getAllVotes(): Promise<Vote[]> {
  return getAllVotesCached()
}

// Returns { [voteId]: { [optionId]: count } } for all provided vote IDs.
// Cached 20 s and keyed by the voteIds argument; tallies move slowly enough that
// a short window is invisible to users but removes a per-load DB hit.
const getVoteResultsBulkCached = unstable_cache(
  async (voteIds: string[]): Promise<Record<string, Record<string, number>>> => {
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
  },
  ['vote-results-bulk'],
  { revalidate: 20 },
)

export async function getVoteResultsBulk(voteIds: string[]): Promise<Record<string, Record<string, number>>> {
  if (voteIds.length === 0) return {}
  return getVoteResultsBulkCached(voteIds)
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

  let effectiveRole
  try { effectiveRole = await getMyDigitalAccessRole() } catch { return { error: 'Member access could not be verified.' } }
  if (!user && !validAnonymousVoteToken(anonToken)) return { error: 'A valid anonymous voting token is required.' }
  const { data: vote, error: voteError } = await createAdminClient().from('votes').select('*').eq('id', response.vote_id).single()
  if (voteError || !vote) return { error: 'Vote could not be found.' }
  const validation = voteSubmissionError(vote, effectiveRole, response.selected_options, Date.now())
  if (validation) return { error: validation }
  if (vote.device_batch_slug) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batchAccess = await (supabase as any).rpc('can_vote_in_device_batch', { p_batch: vote.device_batch_slug })
    if (batchAccess.error || batchAccess.data !== true) return { error: 'Only confirmed holders can vote in this Batch.' }
  }
  const profile = user ? await supabase.from('voyager_profiles').select('display_name,role').eq('id', user.id).single() : { data: null }
  const voterName = profile.data?.display_name ?? null
  const voterRole = profile.data?.role ?? 'guest'
  const voteQuestion = vote.title
  const insert: VoteResponseInsert = {
    vote_id: vote.id,
    selected_options: response.selected_options,
    user_id: user?.id ?? null,
    anon_token: user ? null : anonToken!,
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

  const { data, error } = await supabase
    .from('vote_responses')
    .select('vote_id, selected_options')
    .eq('user_id', user.id)

  if (error) throw new Error('Vote participation could not be checked')
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
