'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { VoteInsert, VoteResponseInsert } from '@/types/database'
import { getPostHogClient } from '@/lib/posthog-server'

export async function getActiveVotes() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Unauthenticated: public votes only
  if (!user) {
    const { data } = await supabase
      .from('votes')
      .select('*')
      .eq('is_active', true)
      .eq('scope', 'public')
      .order('created_at', { ascending: false })
    return data ?? []
  }

  // RLS handles scope filtering based on the user's role
  const { data } = await supabase
    .from('votes')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getAllVotes() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('votes')
    .select('*')
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function createVote(vote: VoteInsert) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', data: null }

  const { data, error } = await supabase
    .from('votes')
    .insert({ ...vote, created_by: user.id })
    .select()
    .single()

  if (error) return { error: error.message, data: null }
  revalidatePath('/votes')
  return { error: null, data }
}

export async function submitVoteResponse(response: Omit<VoteResponseInsert, 'user_id'>, anonToken?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const insert: VoteResponseInsert = {
    ...response,
    user_id: user?.id ?? null,
    anon_token: user ? null : (anonToken ?? null),
  }

  const { error } = await supabase
    .from('vote_responses')
    .insert(insert)

  if (error) return { error: error.message }
  revalidatePath('/votes')
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
