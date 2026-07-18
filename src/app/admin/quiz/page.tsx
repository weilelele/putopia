'use client'

import { useState, useEffect } from 'react'
import {
  adminGetQuizQuestions,
  adminCreateQuestion,
  adminUpdateQuestion,
  adminDeleteQuestion,
  adminReorderQuestions,
} from '@/lib/actions/quiz'
import type { QuizQuestionAdmin, QuizOption } from '@/lib/actions/quiz'

// ─── Shared styles ────────────────────────────────────────────────────────────
const S = {
  card:   { background: '#151B3A', border: '1px solid rgba(255,107,53,0.16)', padding: '20px', marginBottom: '12px' },
  label:  { display: 'block', color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)', letterSpacing: '0.1em', marginBottom: '4px' } as const,
  input:  { width: '100%', background: '#0F1430', border: '1px solid rgba(255,107,53,0.16)', color: '#F5F5F5', padding: '7px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const },
  area:   { width: '100%', background: '#0F1430', border: '1px solid rgba(255,107,53,0.16)', color: '#F5F5F5', padding: '7px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const, minHeight: 72 },
  btn:    { padding: '6px 14px', fontFamily: 'monospace', fontSize: 'var(--fs-caption)', letterSpacing: '0.1em', cursor: 'pointer', border: 'none' },
  btnOk:  { background: '#FF6B35', color: '#070912' },
  btnGhost: { background: 'transparent', border: '1px solid rgba(255,107,53,0.3)', color: 'rgba(245,245,245,0.55)' },
  btnDanger: { background: 'transparent', border: '1px solid rgba(232,48,48,0.4)', color: '#E83030' },
  sel:    { background: '#0F1430', border: '1px solid rgba(255,107,53,0.16)', color: '#F5F5F5', padding: '7px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none' },
}

const QUIZ_ID   = 'applicant-baseline-v1'
const KEYS      = ['a', 'b', 'c', 'd'] as const

// ─── Empty question template ──────────────────────────────────────────────────
function emptyQ(order: number): Omit<QuizQuestionAdmin, 'id'> {
  return {
    quiz_id:    QUIZ_ID,
    sort_order: order,
    prompt:     '',
    options:    KEYS.map(k => ({ key: k, label: '' })),
    answer_key: 'a',
  }
}

// ─── Single question editor ───────────────────────────────────────────────────
function QuestionEditor({
  q,
  onSave,
  onCancel,
  saving,
}: {
  q: Omit<QuizQuestionAdmin, 'id'>
  onSave: (updated: Omit<QuizQuestionAdmin, 'id'>) => void
  onCancel: () => void
  saving: boolean
}) {
  const [draft, setDraft] = useState<Omit<QuizQuestionAdmin, 'id'>>(q)

  const setPrompt = (v: string) => setDraft(d => ({ ...d, prompt: v }))
  const setOption = (key: string, label: string) =>
    setDraft(d => ({ ...d, options: d.options.map(o => o.key === key ? { key, label } : o) }))
  const setAnswer = (v: string) => setDraft(d => ({ ...d, answer_key: v }))

  const valid = draft.prompt.trim() && draft.options.every(o => o.label.trim()) && draft.answer_key

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Prompt */}
      <div>
        <label style={S.label}>QUESTION PROMPT</label>
        <textarea
          style={S.area}
          value={draft.prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Enter the question text..."
          rows={3}
        />
      </div>

      {/* Options */}
      <div>
        <label style={S.label}>OPTIONS & CORRECT ANSWER</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {draft.options.map((opt) => (
            <div key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Radio: mark as correct answer */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0, width: 36 }}>
                <input
                  type="radio"
                  // eslint-disable-next-line react-hooks/purity -- name is cosmetic; the radio is fully controlled via checked/onChange
                  name={`answer-${Math.random()}`}
                  checked={draft.answer_key === opt.key}
                  onChange={() => setAnswer(opt.key)}
                  style={{ accentColor: '#FF6B35', width: 14, height: 14 }}
                />
                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: draft.answer_key === opt.key ? '#FF6B35' : 'rgba(245,245,245,0.35)', letterSpacing: '0.08em', fontWeight: draft.answer_key === opt.key ? 700 : 400 }}>
                  {opt.key.toUpperCase()}
                </span>
              </label>
              <input
                style={{ ...S.input, flex: 1, border: draft.answer_key === opt.key ? '1px solid rgba(255,107,53,0.45)' : '1px solid rgba(255,107,53,0.16)' }}
                value={opt.label}
                onChange={e => setOption(opt.key, e.target.value)}
                placeholder={`Option ${opt.key.toUpperCase()}`}
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: '6px', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.3)', letterSpacing: '0.08em' }}>
          ● = correct answer
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button style={{ ...S.btn, ...S.btnGhost }} onClick={onCancel} disabled={saving}>
          CANCEL
        </button>
        <button
          style={{ ...S.btn, ...S.btnOk, opacity: (!valid || saving) ? 0.5 : 1 }}
          onClick={() => valid && onSave(draft)}
          disabled={!valid || saving}
        >
          {saving ? 'SAVING…' : 'SAVE QUESTION'}
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function QuizAdminPage() {
  const [questions, setQuestions]   = useState<QuizQuestionAdmin[]>([])
  const [loading, setLoading]       = useState(true)
  const [editingId, setEditingId]   = useState<string | 'new' | null>(null)
  const [saving, setSaving]         = useState(false)
  const [msg, setMsg]               = useState<{ text: string; ok: boolean } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setQuestions(await adminGetQuizQuestions())
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    adminGetQuizQuestions().then(q => { if (active) { setQuestions(q); setLoading(false) } })
    return () => { active = false }
  }, [])

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 3000)
  }

  // ── Save (create or update) ────────────────────────────────────────────────
  const handleSave = async (id: string | 'new', draft: Omit<QuizQuestionAdmin, 'id'>) => {
    setSaving(true)
    if (id === 'new') {
      const res = await adminCreateQuestion({ ...draft, sort_order: questions.length + 1 })
      if (res.ok) { flash('Question added ✓', true); await load() }
      else flash(res.error ?? 'Error', false)
    } else {
      const res = await adminUpdateQuestion(id, draft)
      if (res.ok) { flash('Saved ✓', true); await load() }
      else flash(res.error ?? 'Error', false)
    }
    setSaving(false)
    setEditingId(null)
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setSaving(true)
    const res = await adminDeleteQuestion(id)
    if (res.ok) {
      flash('Deleted', true)
      const remaining = questions.filter(q => q.id !== id)
      // Recompute sort_order after deletion
      await adminReorderQuestions(QUIZ_ID, remaining.map(q => q.id))
      await load()
    } else {
      flash(res.error ?? 'Error', false)
    }
    setSaving(false)
    setConfirmDelete(null)
  }

  // ── Move up / down ─────────────────────────────────────────────────────────
  const handleMove = async (id: string, dir: -1 | 1) => {
    const idx = questions.findIndex(q => q.id === id)
    if (idx < 0) return
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= questions.length) return

    const reordered = [...questions]
    ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]]
    setQuestions(reordered) // optimistic
    await adminReorderQuestions(QUIZ_ID, reordered.map(q => q.id))
    await load()
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#F5F5F5', fontSize: '16px', letterSpacing: '0.2em', margin: 0 }}>
            FIELD ASSESSMENT — QUESTION EDITOR
          </h1>
          <div style={{ color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', marginTop: '4px' }}>
            quiz_id: {QUIZ_ID} · pass mark: 4 / {questions.length || '?'}
          </div>
        </div>
        {editingId !== 'new' && (
          <button
            style={{ ...S.btn, ...S.btnOk }}
            onClick={() => setEditingId('new')}
          >
            + ADD QUESTION
          </button>
        )}
      </div>

      {/* Flash message */}
      {msg && (
        <div style={{
          marginBottom: '16px', padding: '10px 14px',
          background: msg.ok ? 'rgba(32,216,144,0.08)' : 'rgba(232,48,48,0.08)',
          border: `1px solid ${msg.ok ? 'rgba(32,216,144,0.3)' : 'rgba(232,48,48,0.3)'}`,
          color: msg.ok ? '#20D890' : '#E83030',
          fontSize: '12px', letterSpacing: '0.1em',
        }}>
          {msg.text}
        </div>
      )}

      {loading && (
        <div style={{ color: 'rgba(245,245,245,0.35)', fontSize: '12px', letterSpacing: '0.15em' }}>
          LOADING...
        </div>
      )}

      {/* New question form */}
      {editingId === 'new' && (
        <div style={{ ...S.card, border: '1px solid rgba(255,107,53,0.4)' }}>
          <div style={{ color: '#FF6B35', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', marginBottom: '16px' }}>
            NEW QUESTION
          </div>
          <QuestionEditor
            q={emptyQ(questions.length + 1)}
            onSave={(d) => handleSave('new', d)}
            onCancel={() => setEditingId(null)}
            saving={saving}
          />
        </div>
      )}

      {/* Question list */}
      {questions.map((q, idx) => {
        const isEditing = editingId === q.id

        return (
          <div key={q.id} style={S.card}>
            {isEditing ? (
              <>
                <div style={{ color: '#FF6B35', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', marginBottom: '16px' }}>
                  EDITING Q{q.sort_order}
                </div>
                <QuestionEditor
                  q={q}
                  onSave={(d) => handleSave(q.id, d)}
                  onCancel={() => setEditingId(null)}
                  saving={saving}
                />
              </>
            ) : (
              <div>
                {/* Top row: index + actions */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                  {/* Order badge */}
                  <div style={{
                    flexShrink: 0, width: 28, height: 28,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)',
                    color: '#FF6B35', fontSize: '12px', letterSpacing: '0.08em', fontFamily: 'monospace',
                  }}>
                    {q.sort_order}
                  </div>

                  {/* Prompt */}
                  <div style={{ flex: 1, color: '#F5F5F5', fontSize: '13px', lineHeight: 1.5 }}>
                    {q.prompt}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button
                      style={{ ...S.btn, ...S.btnGhost, padding: '4px 8px', fontSize: '13px' }}
                      onClick={() => handleMove(q.id, -1)}
                      disabled={idx === 0 || saving}
                      title="Move up"
                    >↑</button>
                    <button
                      style={{ ...S.btn, ...S.btnGhost, padding: '4px 8px', fontSize: '13px' }}
                      onClick={() => handleMove(q.id, 1)}
                      disabled={idx === questions.length - 1 || saving}
                      title="Move down"
                    >↓</button>
                    <button
                      style={{ ...S.btn, ...S.btnGhost }}
                      onClick={() => setEditingId(q.id)}
                    >
                      EDIT
                    </button>
                    {confirmDelete === q.id ? (
                      <>
                        <button
                          style={{ ...S.btn, ...S.btnDanger }}
                          onClick={() => handleDelete(q.id)}
                          disabled={saving}
                        >
                          CONFIRM
                        </button>
                        <button
                          style={{ ...S.btn, ...S.btnGhost }}
                          onClick={() => setConfirmDelete(null)}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        style={{ ...S.btn, ...S.btnDanger }}
                        onClick={() => setConfirmDelete(q.id)}
                      >
                        DEL
                      </button>
                    )}
                  </div>
                </div>

                {/* Options */}
                <div style={{ paddingLeft: '40px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(q.options as QuizOption[]).map((opt) => {
                    const isCorrect = opt.key === q.answer_key
                    return (
                      <div
                        key={opt.key}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '5px 10px',
                          background: isCorrect ? 'rgba(32,216,144,0.06)' : 'transparent',
                          border: `1px solid ${isCorrect ? 'rgba(32,216,144,0.25)' : 'rgba(255,107,53,0.1)'}`,
                        }}
                      >
                        <span style={{
                          width: 20, textAlign: 'center', flexShrink: 0,
                          fontFamily: 'monospace', fontSize: '12px',
                          color: isCorrect ? '#20D890' : 'rgba(245,245,245,0.35)',
                          fontWeight: isCorrect ? 700 : 400,
                          letterSpacing: '0.05em',
                        }}>
                          {isCorrect ? '✓' : opt.key.toUpperCase()}
                        </span>
                        <span style={{
                          fontFamily: 'monospace', fontSize: '12px',
                          color: isCorrect ? 'rgba(32,216,144,0.8)' : 'rgba(245,245,245,0.55)',
                        }}>
                          {opt.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {!loading && questions.length === 0 && editingId !== 'new' && (
        <div style={{ color: 'rgba(245,245,245,0.35)', fontSize: '12px', letterSpacing: '0.12em', textAlign: 'center', padding: '40px 0' }}>
          No questions yet. Click ADD QUESTION to start.
        </div>
      )}
    </div>
  )
}
