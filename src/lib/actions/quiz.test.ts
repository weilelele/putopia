import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ user: null as { id: string } | null, role: 'applicant', kind: 'human', error: null as string | null, admin: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user }, error: state.error }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: state.role, account_kind: state.kind }, error: state.error }) }) }) }),
  }),
  createAdminClient: state.admin,
}))
vi.mock('@/lib/actions/tasks', () => ({ markQuizPassed: vi.fn() }))
import { adminGetQuizQuestions, adminCreateQuestion, adminUpdateQuestion, adminDeleteQuestion, adminReorderQuestions } from './quiz'

const calls = [
  () => adminGetQuizQuestions(),
  () => adminCreateQuestion({ quiz_id: 'test', sort_order: 0, prompt: 'Question', options: [], answer_key: 'A' }),
  () => adminUpdateQuestion('question', { answer_key: 'B' }),
  () => adminDeleteQuestion('question'),
  () => adminReorderQuestions('test', []),
]
beforeEach(() => {
  state.user = null; state.role = 'applicant'; state.kind = 'human'; state.error = null
  state.admin.mockReset()
})
describe('quiz administrator authorization', () => {
  it.each(['guest', 'applicant', 'voyager', 'npc architect', 'failed lookup'])('denies %s before creating a privileged client', async identity => {
    if (identity !== 'guest') state.user = { id: 'user' }
    if (identity === 'voyager') state.role = 'voyager'
    if (identity === 'npc architect') { state.role = 'architect'; state.kind = 'npc' }
    if (identity === 'failed lookup') { state.role = 'architect'; state.error = 'unavailable' }
    for (const call of calls) await expect(call()).rejects.toThrow('Administrator access required.')
    expect(state.admin).not.toHaveBeenCalled()
  })
  it('allows a verified human architect', async () => {
    state.user = { id: 'admin' }; state.role = 'architect'
    state.admin.mockReturnValue({ from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) }) })
    await expect(adminGetQuizQuestions()).resolves.toEqual([])
    expect(state.admin).toHaveBeenCalledOnce()
  })
})
