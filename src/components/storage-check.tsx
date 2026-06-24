'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'

/**
 * "Check Storage" — sits under the device functions panel, not as its own card.
 * Tapping it opens the "Your Code" screen: a real-looking unlock surface where a
 * code-holder would enter the 6-digit code from the back of their badge. A
 * visitor without a code takes the "No code? Apply →" exit to the Initial Pack.
 *
 * Code validation / actual unlock is intentionally out of scope this period
 * (PRD §7) — the surface is real, the check isn't. Confirm gives honest feedback
 * rather than a fake unlock; the only wired route is "apply" → the pack.
 */
export function CheckStorage({ packHref = '/voyager-pack' }: { packHref?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="btn-secondary"
        style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}
        onClick={() => { posthog.capture('check_storage_clicked'); setOpen(true) }}
      >
        <LockGlyph />
        Check Storage
      </button>

      {open && <YourCode packHref={packHref} onClose={() => setOpen(false)} />}
    </>
  )
}

function YourCode({ packHref, onClose }: { packHref: string; onClose: () => void }) {
  const [digits, setDigits] = useState<string[]>(() => Array(6).fill(''))
  const [status, setStatus] = useState('')
  const code = digits.join('')

  const confirm = () => {
    posthog.capture('your_code_confirm_clicked', { length: code.length })
    // No code-verification backend this period (PRD §7) — the surface is real,
    // the check isn't. Give honest feedback rather than a fake unlock.
    setStatus(code.length < 6 ? 'Enter all 6 digits.' : 'Code not recognized.')
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Your code"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(8,11,26,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 320,
          width: '100%',
          background: 'var(--bg-panel)',
          border: '1px solid var(--bd-orange)',
          borderRadius: 'var(--radius)',
          padding: '1.5rem 1.25rem',
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', color: 'var(--color-nucleus)' }}>
          YOUR CODE
        </div>
        <p style={{ fontSize: 'var(--fs-title)', color: 'var(--color-star)', margin: '0.5rem 0 0' }}>
          Enter your code
        </p>
        <p style={{ fontSize: 'var(--fs-label)', color: 'var(--color-star-dim)', lineHeight: 1.5, margin: '0.4rem 0 0' }}>
          The 6-digit code from the back of your badge.
        </p>

        <div style={{ marginTop: '1rem' }}>
          <CodeInput digits={digits} setDigits={setDigits} />
        </div>

        {status && (
          <p style={{ fontSize: 'var(--fs-caption)', color: 'var(--color-fault)', margin: '0.75rem 0 0' }}>
            {status}
          </p>
        )}

        <button
          type="button"
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
          onClick={confirm}
        >
          Confirm
        </button>
        <Link
          href={packHref}
          className="btn-secondary"
          style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '0.6rem' }}
          onClick={() => posthog.capture('your_code_apply_clicked')}
        >
          No code? Apply →
        </Link>
      </div>
    </div>
  )
}

/** Six single-digit boxes with auto-advance + backspace-to-previous. */
function CodeInput({ digits, setDigits }: { digits: string[]; setDigits: (v: string[]) => void }) {
  const length = digits.length
  const refs = useRef<Array<HTMLInputElement | null>>([])

  const setAt = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = digit
    setDigits(next)
    if (digit && i < length - 1) refs.current[i + 1]?.focus()
  }

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
  }

  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {digits.map((v, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          inputMode="numeric"
          maxLength={1}
          value={v}
          onChange={(e) => setAt(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          aria-label={`Code digit ${i + 1}`}
          style={{
            width: 34,
            height: 42,
            textAlign: 'center',
            fontSize: 'var(--fs-title)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-nucleus)',
            background: 'transparent',
            border: '1px solid var(--bd-orange)',
            borderRadius: 'var(--radius)',
            outline: 'none',
          }}
        />
      ))}
    </div>
  )
}

function LockGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <rect x="5" y="10.5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
