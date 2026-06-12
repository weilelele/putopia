'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { markQuizPassed } from '@/lib/actions/tasks'

// ─── Public types (no answer_key) ────────────────────────────────────────────

export type QuizOption = { key: string; label: string }

export type QuizQuestion = {
  id: string
  quiz_id: string
  sort_order: number
  prompt: string
  options: QuizOption[]
}

// Admin type includes the answer
export type QuizQuestionAdmin = QuizQuestion & { answer_key: string }

export type SubmitResult = {
  ok: boolean
  score: number
  total: number
  passed: boolean
  pass_mark: number
}

// ─── Public: load questions (no answer_key) ───────────────────────────────────

export async function getQuizQuestions(
  quizId = 'applicant-baseline-v1',
): Promise<QuizQuestion[]> {
  // Use admin client — answer_key is stripped below (never sent to browser)
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('id, quiz_id, sort_order, prompt, options')
    .eq('quiz_id', quizId)
    .order('sort_order')

  if (error || !data) return []
  return data as QuizQuestion[]
}

// ─── Public: submit answers (server-side scoring) ────────────────────────────

/** Pass_mark is stored here — clients never see the answer_key or threshold. */
const PASS_MARK = 4

export async function submitQuizAnswers(
  answers: Record<string, string>,   // { [questionId]: selectedKey }
  quizId = 'applicant-baseline-v1',
): Promise<SubmitResult> {
  const supabase = createAdminClient()

  // Fetch with answer_key (server only — never leaves this action)
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('id, answer_key')
    .eq('quiz_id', quizId)

  if (error || !data) {
    return { ok: false, score: 0, total: 0, passed: false, pass_mark: PASS_MARK }
  }

  const score  = data.filter(
    (q: { id: string; answer_key: string }) => answers[q.id] === q.answer_key
  ).length
  const total  = data.length
  const passed = score >= PASS_MARK

  if (passed) {
    await markQuizPassed()
  }

  return { ok: true, score, total, passed, pass_mark: PASS_MARK }
}

// ─── Admin: full CRUD ─────────────────────────────────────────────────────────

export async function adminGetQuizQuestions(
  quizId = 'applicant-baseline-v1',
): Promise<QuizQuestionAdmin[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('sort_order')

  if (error || !data) return []
  return data as QuizQuestionAdmin[]
}

export async function adminCreateQuestion(
  q: Omit<QuizQuestionAdmin, 'id'>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('quiz_questions')
    .insert({ ...q, updated_at: new Date().toISOString() })
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function adminUpdateQuestion(
  id: string,
  patch: Partial<Omit<QuizQuestionAdmin, 'id'>>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('quiz_questions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function adminDeleteQuestion(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('quiz_questions')
    .delete()
    .eq('id', id)
  return error ? { ok: false, error: error.message } : { ok: true }
}

// Reorder: swap sort_order values of two questions
export async function adminReorderQuestions(
  quizId: string,
  orderedIds: string[],   // full ordered list of IDs
): Promise<{ ok: boolean }> {
  const supabase = createAdminClient()
  const updates = orderedIds.map((id, idx) =>
    supabase
      .from('quiz_questions')
      .update({ sort_order: idx + 1, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('quiz_id', quizId)
  )
  await Promise.all(updates)
  return { ok: true }
}
