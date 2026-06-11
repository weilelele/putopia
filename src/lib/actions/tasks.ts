'use server'

import { createClient } from '@/lib/supabase/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApplicantTaskStatus = {
  sighting: boolean  // submitted at least one world
  votes:    boolean  // cast votes on at least 2 distinct vote items
  intel:    boolean  // scrolled to the end of an architect report
  quiz:     boolean  // passed the assessment
  allDone:  boolean
}

// ─── Read task status ─────────────────────────────────────────────────────────

export async function getApplicantTaskStatus(
  userId?: string,
): Promise<ApplicantTaskStatus> {
  const supabase = await createClient()

  // Use provided userId or fall back to auth session
  let uid = userId
  if (!uid) {
    const { data: { session } } = await supabase.auth.getSession()
    uid = session?.user?.id
  }
  if (!uid) {
    return { sighting: false, votes: false, intel: false, quiz: false, allDone: false }
  }

  // Run all checks in parallel
  const [sightingRes, votesRes, profileRes] = await Promise.all([
    // Task 1: Has submitted at least one world
    supabase
      .from('worlds')
      .select('id', { count: 'exact', head: true })
      .eq('submitted_by', uid),

    // Task 2: Has cast votes on at least 2 distinct vote items
    supabase
      .from('vote_responses')
      .select('vote_id')
      .eq('user_id', uid),

    // Tasks 3 & 4: Read from profile timestamp columns
    supabase
      .from('voyager_profiles')
      .select('task_intel_at, task_quiz_at')
      .eq('id', uid)
      .single(),
  ])

  const sighting = (sightingRes.count ?? 0) > 0

  const distinctVotes = new Set(
    (votesRes.data ?? []).map((r: { vote_id: string }) => r.vote_id),
  ).size
  const votes = distinctVotes >= 2

  const intel = !!profileRes.data?.task_intel_at
  const quiz  = !!profileRes.data?.task_quiz_at

  return { sighting, votes, intel, quiz, allDone: sighting && votes && intel && quiz }
}

// ─── Mark intel read ──────────────────────────────────────────────────────────

/** Call when the user scrolls to the bottom of an architect report. Idempotent. */
export async function markIntelRead(): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const uid = session?.user?.id
  if (!uid) return { ok: false }

  // Only set if not already set (preserve first-read timestamp)
  const { data: profile } = await supabase
    .from('voyager_profiles')
    .select('task_intel_at')
    .eq('id', uid)
    .single()

  if (profile?.task_intel_at) return { ok: true }  // already done

  const { error } = await supabase
    .from('voyager_profiles')
    .update({ task_intel_at: new Date().toISOString() })
    .eq('id', uid)

  return { ok: !error }
}

// ─── Mark quiz passed ─────────────────────────────────────────────────────────

/** Call when the user passes the assessment. Idempotent. */
export async function markQuizPassed(): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const uid = session?.user?.id
  if (!uid) return { ok: false }

  const { data: profile } = await supabase
    .from('voyager_profiles')
    .select('task_quiz_at')
    .eq('id', uid)
    .single()

  if (profile?.task_quiz_at) return { ok: true }  // already done

  const { error } = await supabase
    .from('voyager_profiles')
    .update({ task_quiz_at: new Date().toISOString() })
    .eq('id', uid)

  return { ok: !error }
}
