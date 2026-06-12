'use server'

/**
 * Applicant task-tracking engine.
 *
 * Reconstructed from docs/system-design.md §3–5 + schema_v31 (voyager_profiles
 * .task_quiz_at / .task_intel_at) + caller usage. The four Applicant tasks:
 *   - sighting : the user submitted a world to the pipeline (worlds.submitted_by)
 *   - votes    : ≥2 DISTINCT vote_id in vote_responses
 *   - intel    : read an Architect report to the end (task_intel_at set)
 *   - quiz     : passed the entry assessment (task_quiz_at set)
 *
 * Quiz/intel completion are explicit timestamps; sighting/votes are queried live.
 */
import { createClient, createAdminClient } from '@/lib/supabase/server'

export interface ApplicantTaskStatus {
  sighting: boolean
  votes: boolean
  intel: boolean
  quiz: boolean
  allDone: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

async function getUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** Mark the entry assessment as passed for the current user (idempotent). */
export async function markQuizPassed(): Promise<{ ok: boolean }> {
  const uid = await getUserId()
  if (!uid) return { ok: false }
  const admin = createAdminClient() as DB
  await admin
    .from('voyager_profiles')
    .update({ task_quiz_at: new Date().toISOString() })
    .eq('id', uid)
    .is('task_quiz_at', null)
  return { ok: true }
}

/** Mark "read an Architect report" complete (called when an intel article is
 *  scrolled to the bottom). Idempotent. */
export async function markIntelRead(): Promise<{ ok: boolean }> {
  const uid = await getUserId()
  if (!uid) return { ok: false }
  const admin = createAdminClient() as DB
  await admin
    .from('voyager_profiles')
    .update({ task_intel_at: new Date().toISOString() })
    .eq('id', uid)
    .is('task_intel_at', null)
  return { ok: true }
}

/** Current Applicant checklist status for the signed-in user. */
export async function getApplicantTaskStatus(): Promise<ApplicantTaskStatus> {
  const empty: ApplicantTaskStatus = { sighting: false, votes: false, intel: false, quiz: false, allDone: false }
  const uid = await getUserId()
  if (!uid) return empty
  const admin = createAdminClient() as DB

  // explicit timestamp flags
  const { data: profile } = await admin
    .from('voyager_profiles')
    .select('task_quiz_at, task_intel_at')
    .eq('id', uid)
    .single()
  const quiz = !!profile?.task_quiz_at
  const intel = !!profile?.task_intel_at

  // sighting: a world submitted by this user (degrades to false if column absent)
  let sighting = false
  const { count } = await admin
    .from('worlds')
    .select('id', { count: 'exact', head: true })
    .eq('submitted_by', uid)
  sighting = (count ?? 0) > 0

  // votes: ≥2 distinct vote_id (anon_token votes don't carry user_id)
  let votes = false
  const { data: vr } = await admin
    .from('vote_responses')
    .select('vote_id')
    .eq('user_id', uid)
  if (vr) {
    votes = new Set((vr as { vote_id: string }[]).map((r) => r.vote_id)).size >= 2
  }

  const allDone = sighting && votes && intel && quiz
  return { sighting, votes, intel, quiz, allDone }
}
