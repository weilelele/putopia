'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getVoyagerPathStatus } from '@/lib/actions/tasks'
import type { VoyagerPathStatus } from '@/lib/actions/tasks'

// ─── Icons ────────────────────────────────────────────────────────────────────

// Stage node icons
function ApplicantIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      {/* Compass rose — 4 cardinal points */}
      <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10 2.5v3.5M10 14v3.5M2.5 10H6M14 10h3.5"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      {/* Diagonal minor points, lighter */}
      <path d="M5 5l1.8 1.8M13.2 13.2l1.8 1.8M15 5l-1.8 1.8M6.8 13.2L5 15"
        stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.45" />
    </svg>
  )
}

function VoyagerIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      {/* Planet body */}
      <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.3" />
      {/* Orbital ring — tilted ellipse */}
      <ellipse cx="10" cy="10" rx="9" ry="3.2"
        stroke="currentColor" strokeWidth="1.1" opacity="0.55"
        transform="rotate(-28 10 10)" />
    </svg>
  )
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <polyline points="2,7 6,11 12,3" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LockIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <rect x="2.5" y="6.5" width="9" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4.5 6.5V4.5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

// Pack icons
function WorldPackIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.4" />
      <ellipse cx="14" cy="14" rx="5.5" ry="11" stroke="currentColor" strokeWidth="1.2" />
      <line x1="3" y1="14" x2="25" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <line x1="5" y1="9"  x2="23" y2="9"  stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <line x1="5" y1="19" x2="23" y2="19" stroke="currentColor" strokeWidth="1" opacity="0.35" />
    </svg>
  )
}


function ConsoleIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="2.8" fill="currentColor" />
      <circle cx="14" cy="14" r="6.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.5 2.5" />
      <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
    </svg>
  )
}

// Task icons
function WorldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.2" />
      <ellipse cx="9" cy="9" rx="3.5" ry="7.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="1.5" y1="9" x2="16.5" y2="9" stroke="currentColor" strokeWidth="1" opacity="0.7" />
    </svg>
  )
}

function SignalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      {/* centre dot */}
      <circle cx="9" cy="9" r="1.6" fill="currentColor" />
      {/* inner arc */}
      <path d="M5.8 12.2a4.5 4.5 0 010-6.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M12.2 5.8a4.5 4.5 0 010 6.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* outer arc */}
      <path d="M3.3 14.7a8 8 0 010-11.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.5" fill="none" />
      <path d="M14.7 3.3a8 8 0 010 11.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.5" fill="none" />
    </svg>
  )
}

function IntelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="3" y="1.5" width="12" height="15" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <line x1="6" y1="6"  x2="12" y2="6"  stroke="currentColor" strokeWidth="1" />
      <line x1="6" y1="9"  x2="12" y2="9"  stroke="currentColor" strokeWidth="1" />
      <line x1="6" y1="12" x2="10" y2="12" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

function QuizIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 7.2c0-1.1.9-2 2-2s2 .9 2 2c0 .9-.5 1.5-1.3 1.8L9 9.5v1"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="9" cy="12.5" r="0.8" fill="currentColor" />
    </svg>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskKey    = 'report_sighting' | 'pass_quiz' | 'get_pack'
type ViewStage  = 'applicant' | 'voyager' | 'console'
type ModalKind  = 'device_seeker' | 'console_locked' | 'signal_locked'

// ─── Task definitions ─────────────────────────────────────────────────────────
// Three EQUAL, independent steps — any order, no prerequisites. Completing all
// three (including the $12 pack) unlocks Voyager status. The pack is just one of
// the three: a user can buy it first, last, or anywhere in between.

const TASKS: {
  key: TaskKey; num: string; label: string; description: string
  href: string; icon: React.ReactNode; accentColor: string; chip?: string
}[] = [
  {
    key: 'report_sighting', num: '01', label: 'Report a Sighting',
    description: 'Document a signal, image, or encounter with a parallel world.',
    href: '/worlds/submit', icon: <WorldIcon />, accentColor: '#FF6B35',
  },
  {
    key: 'pass_quiz', num: '02', label: 'Qualify for Active Service',
    description: 'Complete the field assessment to demonstrate you are ready for active service.',
    href: '/quiz', icon: <QuizIcon />, accentColor: '#FF6B35',
  },
  {
    key: 'get_pack', num: '03', label: 'Get Your Voyager Pack',
    description: 'Claim your physical badge, member number and cohort placement.',
    href: '/voyager-pack', icon: <WorldPackIcon size={18} />, accentColor: '#FF6B35', chip: '$12',
  },
]

// ─── Centered modal (click anywhere to close) ─────────────────────────────────

function Modal({ kind, onClose }: { kind: ModalKind | null; onClose: () => void }) {
  if (!kind) return null

  const isDevice  = kind === 'device_seeker'
  const isSignal  = kind === 'signal_locked'
  const accent    = isDevice ? '#E8A020' : isSignal ? '#E85D04' : '#60B0FF'
  const borderClr = isDevice ? 'rgba(232,160,32,0.3)' : isSignal ? 'rgba(232,93,4,0.3)' : 'rgba(96,176,255,0.25)'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(10,14,39,0.82)',
        backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 60, padding: '24px',
        animation: 'modal-backdrop-in 0.15s ease-out',
      }}
    >
      <div className="dd-panel" style={{
        maxWidth: 400, width: '100%',
        ['--dd-bd' as string]: borderClr,
        ['--dd-fill' as string]: '#0F1430',
        padding: '24px 28px 20px',
        animation: 'modal-in 0.18s cubic-bezier(0.34,1.56,0.64,1)',
        filter: 'drop-shadow(0 0 40px rgba(10,14,39,0.6))',
      }}>
        <i className="dd-node" />
        <i className="dd-dash" />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 12,
        }}>
          <LockIcon size={13} />
          <span style={{ fontSize: 'var(--fs-label)', color: accent, letterSpacing: '0.12em' }}>
            {isDevice ? 'MATERIALS IN PREPARATION' : isSignal ? 'COMING SOON' : 'DEVICE SCAN IN PROGRESS'}
          </span>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.5)', lineHeight: 1.75 }}>
          {isDevice
            ? 'The materials for this career track are still being prepared. Please stand by.'
            : isSignal
            ? 'Signal analysis and device tracking missions are being prepared. Voyagers will be the first to receive access when they go live.'
            : "We're currently scanning for devices. We'll share updates as soon as we have news."
          }
        </p>
        <div style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.15)', letterSpacing: '0.14em', textAlign: 'center' }}>
          TAP ANYWHERE TO DISMISS
        </div>
      </div>

      <style>{`
        @keyframes modal-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ─── Benefit detail modal (Applicant preview: explains what each benefit is) ──

type BenefitDetail = { title: string; sublabel: string; body: string }

function BenefitDetailModal({ item, onClose }: { item: BenefitDetail; onClose: () => void }) {
  const gold = (a: number) => `rgba(196,169,106,${a})`
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(10,14,39,0.82)',
        backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 60, padding: '24px',
        animation: 'modal-backdrop-in 0.15s ease-out',
      }}
    >
      <div className="dd-panel" style={{
        maxWidth: 400, width: '100%',
        ['--dd-bd' as string]: gold(0.45),
        ['--dd-fill' as string]: '#0F1430',
        padding: '22px 26px 18px',
        animation: 'modal-in 0.18s cubic-bezier(0.34,1.56,0.64,1)',
        filter: 'drop-shadow(0 0 40px rgba(10,14,39,0.6))',
      }}>
        <i className="dd-node" />
        <i className="dd-dash" />
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 'var(--fs-label)', color: gold(0.85), letterSpacing: '0.12em', marginBottom: 4 }}>
            {item.title}
          </div>
          <div style={{ fontSize: 'var(--fs-caption)', color: gold(0.45), letterSpacing: '0.1em' }}>
            {item.sublabel}
          </div>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.5)', lineHeight: 1.75 }}>
          {item.body}
        </p>
        <div style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.15)', letterSpacing: '0.14em', textAlign: 'center' }}>
          TAP ANYWHERE TO DISMISS
        </div>
      </div>
    </div>
  )
}

// ─── Demo controls bar ────────────────────────────────────────────────────────

// ─── Path Rail (stage bar — full width, arrow connectors) ────────────────────

function PathRail({
  allDone, isVoyager,
  viewedStage, onStageClick, onConsoleClick,
}: {
  allDone: boolean
  isVoyager: boolean
  viewedStage: ViewStage
  onStageClick: (s: ViewStage) => void
  onConsoleClick: () => void
}) {
  // APPLICANT node: green if voyager, amber if tasks done, amber-dim otherwise
  const applicantDone  = allDone || isVoyager
  const applicantHex   = applicantDone ? '#20D890' : '#E8A020'
  const applicantColor = applicantDone ? 'var(--color-ok)' : 'var(--color-warn)'

  // VOYAGER node: gold current if isVoyager, dim-preview if applicant clicked, inactive otherwise
  const voyagerCurrent  = isVoyager
  const voyagerPreview  = !isVoyager && viewedStage === 'voyager'
  const voyagerHex      = 'rgba(196,169,106,'
  const vBorder = voyagerCurrent ? `${voyagerHex}0.75)` : voyagerPreview ? `${voyagerHex}0.45)` : `${voyagerHex}0.22)`
  const vBg     = voyagerCurrent ? `${voyagerHex}0.12)` : voyagerPreview ? `${voyagerHex}0.06)` : 'transparent'
  const vColor  = voyagerCurrent ? `${voyagerHex}0.95)` : voyagerPreview ? `${voyagerHex}0.6)` : `${voyagerHex}0.38)`

  // A→V connector: fully lit when voyager, half-lit when allDone, dim otherwise
  const avConnector = isVoyager
    ? 'linear-gradient(90deg,#20D890,rgba(32,216,144,0.6))'
    : allDone ? 'linear-gradient(90deg,#E85D04,#FF6B35)' : 'rgba(255,107,53,0.12)'
  const avChevron = isVoyager ? '#20D890' : allDone ? '#FF6B35' : 'rgba(255,107,53,0.22)'

  return (
    <div className="dd-panel" style={{
      ['--dd-bd' as string]: isVoyager ? 'rgba(196,169,106,0.4)' : 'rgba(255,107,53,0.25)',
    }}>
      <i className="dd-node" />
      <i className="dd-dash" />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 28px' }}>

        {/* ── APPLICANT ── */}
        <div
          onClick={() => !isVoyager && onStageClick('applicant')}
          style={{ flexShrink: 0, textAlign: 'center', width: 72, cursor: isVoyager ? 'default' : 'pointer' }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: '50%', margin: '0 auto 7px',
            border: `2px solid ${applicantHex}`,
            background: `${applicantHex}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: applicantColor,
            animation: applicantDone
              ? (isVoyager ? 'none' : 'node-done 0.4s ease-out')
              : 'node-pulse 2.4s ease-in-out infinite',
            outline: (!isVoyager && viewedStage === 'applicant') ? `2px solid ${applicantHex}45` : 'none',
            outlineOffset: 3,
            transition: 'all 0.35s ease',
            opacity: isVoyager ? 0.6 : 1,
          }}>
            {applicantDone ? <CheckIcon size={18} /> : <ApplicantIcon size={20} />}
          </div>
          <div style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.13em', color: applicantColor, fontFamily: 'var(--font-mono)', opacity: isVoyager ? 0.55 : 1, transition: 'opacity 0.3s' }}>
            APPLICANT
          </div>
          <div style={{ fontSize: 'var(--fs-caption)', color: `${applicantHex}80`, letterSpacing: '0.08em', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
            {applicantDone ? 'COMPLETE' : 'CURRENT'}
          </div>
        </div>

        {/* ── A → V connector ── */}
        <div style={{ flex: 1, paddingTop: 21, display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1, height: 2, background: avConnector, transition: 'background 0.5s' }} />
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
            <path d="M2 1l5 4-5 4" stroke={avChevron} strokeWidth="1.4"
              strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.5s' } as React.CSSProperties} />
          </svg>
          <div style={{ flex: 1, height: 2, background: isVoyager ? 'rgba(196,169,106,0.15)' : 'rgba(255,107,53,0.06)', transition: 'background 0.5s' }} />
        </div>

        {/* ── VOYAGER ── */}
        <div
          onClick={() => !isVoyager && onStageClick('voyager')}
          style={{ flexShrink: 0, textAlign: 'center', width: 72, cursor: isVoyager ? 'default' : 'pointer' }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: '50%', margin: '0 auto 7px',
            border: `2px solid ${vBorder}`,
            background: vBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: vColor,
            animation: voyagerCurrent ? 'voyager-pulse 2.4s ease-in-out infinite' : 'none',
            outline: voyagerCurrent ? `2px solid rgba(196,169,106,0.2)` : 'none',
            outlineOffset: 3,
            transition: 'all 0.35s ease',
          }}>
            <VoyagerIcon size={20} />
          </div>
          <div style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.13em', color: vColor, fontFamily: 'var(--font-mono)', transition: 'color 0.3s' }}>
            VOYAGER
          </div>
          {voyagerCurrent && (
            <div style={{ fontSize: 'var(--fs-caption)', color: 'rgba(196,169,106,0.55)', letterSpacing: '0.08em', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
              CURRENT
            </div>
          )}
        </div>

        {/* ── V → C connector ── */}
        <div style={{ flex: 1, paddingTop: 21, display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1, height: 2, background: 'rgba(255,107,53,0.06)' }} />
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
            <path d="M2 1l5 4-5 4" stroke="rgba(255,107,53,0.15)" strokeWidth="1.4"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ flex: 1, height: 2, background: 'rgba(255,107,53,0.04)' }} />
        </div>

        {/* ── CONSOLE HOLDER ── */}
        <div
          onClick={onConsoleClick}
          style={{ flexShrink: 0, textAlign: 'center', width: 72, cursor: 'pointer' }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: '50%', margin: '0 auto 7px',
            border: '2px solid rgba(255,107,53,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,107,53,0.38)',
          }}>
            <LockIcon size={14} />
          </div>
          <div style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.13em', color: 'rgba(255,107,53,0.38)', fontFamily: 'var(--font-mono)' }}>
            CONSOLE
          </div>
          <div style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.08em', color: 'rgba(255,107,53,0.28)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            HOLDER
          </div>
        </div>

      </div>

      <style>{`
        @keyframes node-pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(232,160,32,0.22); }
          50%       { box-shadow: 0 0 22px rgba(232,160,32,0.5), 0 0 44px rgba(232,160,32,0.12); }
        }
        @keyframes node-done {
          0%  { transform: scale(0.9); opacity: 0.6; }
          60% { transform: scale(1.06); }
          100%{ transform: scale(1); opacity: 1; }
        }
        @keyframes voyager-pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(196,169,106,0.2); }
          50%       { box-shadow: 0 0 24px rgba(196,169,106,0.55), 0 0 48px rgba(196,169,106,0.15); }
        }
        @keyframes pack-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,107,53,0); }
          50%       { box-shadow: 0 0 18px rgba(255,107,53,0.18), inset 0 0 18px rgba(255,107,53,0.04); }
        }
      `}</style>
    </div>
  )
}

// ─── APPLICANT stage: three EQUAL parallel tasks → Voyager ────────────────────
// No prerequisites between tasks. Sighting, Quiz and Pack are peers; finishing
// all three (in any order) unlocks Voyager status.

function VoyagerUnlockTrack({
  completed, allDone, doneCount,
}: {
  completed: Record<TaskKey, boolean>
  allDone: boolean
  doneCount: number
}) {
  const gold    = (a: number) => `rgba(196,169,106,${a})`
  const green   = '#20D890'
  const orange  = '#FF6B35'

  // Task node — identical treatment for all three (equal weight).
  const taskNode = (done: boolean, icon: React.ReactNode) => (
    <div style={{
      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: done ? 'rgba(32,216,144,0.12)' : 'rgba(255,107,53,0.07)',
      border: `1.5px solid ${done ? green : 'rgba(255,107,53,0.5)'}`,
      color: done ? green : orange,
      transition: 'all 0.25s ease',
    }}>
      {done ? <CheckIcon size={15} /> : icon}
    </div>
  )
  // A single equal task card. All three look identical (no order). The card
  // links to the real task page; a green/DONE state reflects live status.
  const taskCard = (task: typeof TASKS[number]) => {
    const done = completed[task.key]
    return (
      <Link
        key={task.key}
        href={task.href}
        className="dd-panel"
        style={{
          ['--dd-bd' as string]: done ? 'rgba(32,216,144,0.45)' : 'rgba(255,107,53,0.32)',
          ['--dd-fill' as string]: done ? 'rgba(32,216,144,0.05)' : '#0F1430',
          display: 'flex', alignItems: 'flex-start', gap: 12,
          width: '100%', textAlign: 'left', cursor: 'pointer', textDecoration: 'none',
          padding: '13px 14px', fontFamily: 'var(--font-mono)', background: 'none',
          transition: 'all 0.2s ease',
        }}
      >
        <i className="dd-node" /><i className="dd-dash" />
        {taskNode(done, task.icon)}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--fs-label)', color: done ? 'rgba(32,216,144,0.85)' : '#F5F5F5' }}>{task.label}</span>
            {task.chip && (
              <span style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.08em', color: done ? green : orange, border: `1px solid ${done ? 'rgba(32,216,144,0.3)' : 'rgba(255,107,53,0.35)'}`, padding: '1px 6px', background: done ? 'rgba(32,216,144,0.08)' : 'rgba(255,107,53,0.08)' }}>{task.chip}</span>
            )}
            {done && (
              <span style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.14em', color: green, border: '1px solid rgba(32,216,144,0.25)', padding: '1px 6px', background: 'rgba(32,216,144,0.08)' }}>DONE</span>
            )}
          </div>
          <div style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.42)', lineHeight: 1.5 }}>{task.description}</div>
        </div>
        <div style={{ flexShrink: 0, marginTop: 7, color: done ? 'rgba(32,216,144,0.55)' : task.accentColor }}>
          {done ? <CheckIcon size={15} /> : <ArrowIcon size={15} />}
        </div>
      </Link>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* three EQUAL tasks — stacked as peers, no connecting spine (no order) */}
      {TASKS.map(taskCard)}

      {/* convergence arrow → all three feed the single unlock */}
      <div style={{ textAlign: 'center', color: allDone ? gold(0.7) : 'rgba(245,245,245,0.25)', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', margin: '1px 0' }}>
        ⌄ ALL THREE UNLOCK ⌄
      </div>

      {/* Voyager unlock — lights up only when all three are done */}
      <div className="dd-panel" style={{
        ['--dd-bd' as string]: allDone ? gold(0.55) : 'rgba(255,255,255,0.12)',
        ['--dd-fill' as string]: allDone ? '#161329' : '#0C1029',
        padding: '15px 16px',
        display: 'flex', alignItems: 'center', gap: 13,
        boxShadow: allDone ? `0 0 22px ${gold(0.18)}` : 'none',
        transition: 'all 0.35s ease',
      }}>
        <i className="dd-node" /><i className="dd-dash" />
        <div style={{
          width: 36, height: 36, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: allDone ? 'rotate(45deg)' : 'none',
          borderRadius: allDone ? 0 : '50%',
          background: allDone ? gold(0.16) : 'rgba(255,255,255,0.02)',
          border: `1.5px solid ${allDone ? gold(0.8) : 'rgba(255,255,255,0.14)'}`,
          color: allDone ? gold(0.9) : 'rgba(245,245,245,0.3)',
          transition: 'all 0.35s ease',
        }}>
          <span style={{ transform: allDone ? 'rotate(-45deg)' : 'none', display: 'inline-flex' }}>
            {allDone ? <VoyagerIcon size={18} /> : <LockIcon size={15} />}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--fs-label)', color: allDone ? gold(0.92) : 'rgba(245,245,245,0.55)' }}>Voyager Status</span>
            {allDone && (
              <span style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.16em', color: gold(0.9), border: `1px solid ${gold(0.45)}`, padding: '1px 6px', background: gold(0.12) }}>UNLOCKED ✦</span>
            )}
          </div>
          <div style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.42)', lineHeight: 1.5 }}>
            {allDone
              ? 'All three steps complete — welcome to the Collective, Voyager.'
              : `Complete all three steps above, in any order. ${doneCount} of 3 done.`}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── VOYAGER stage content ────────────────────────────────────────────────────

function VoyagerStageContent({ onItemClick }: { onItemClick: (item: BenefitDetail) => void }) {
  const gold = (a: number) => `rgba(196,169,106,${a})`

  const preview: (BenefitDetail & { icon: React.ReactNode })[] = [
    {
      icon: <ConsoleIcon size={18} />,
      title: 'CONSOLE — PRIORITY APPLICATION',
      sublabel: 'First in line for limited hardware',
      body: 'Voyagers are first in line to apply for the next Multiverse Console. Reserve limited hardware before public availability.',
    },
    {
      icon: <IntelIcon />,
      title: 'INTEL & DECISIONS',
      sublabel: 'Access reports and shape Collective decisions',
      body: 'Access all Architect intelligence dispatches and participate in Collective votes — stay informed and help shape the mission.',
    },
    {
      icon: <VoyagerIcon size={18} />,
      title: 'VOYAGER IDENTITY',
      sublabel: 'Your permanent number and cohort placement',
      body: 'Receive a permanent Voyager number and cohort designation — your unique position and rank within the Collective.',
    },
    {
      icon: <SignalIcon />,
      title: 'SIGNAL ANALYSIS & DEVICE TRACKING',
      sublabel: 'Active field operations — coming soon',
      body: 'Decode anomalous signal transmissions and trace active Multiverse Consoles in the field. Signal missions are available to Voyagers only.',
    },
  ]

  return (
    <div className="dd-panel" style={{ ['--dd-bd' as string]: gold(0.3) }}>
      <i className="dd-node" />
      <i className="dd-dash" />

      {/* Header */}
      <div style={{
        padding: '12px 18px',
        borderBottom: `1px solid ${gold(0.07)}`,
        display: 'flex', alignItems: 'center', gap: 9,
      }}>
        <div style={{ color: gold(0.45) }}><VoyagerIcon size={14} /></div>
        <span style={{ fontSize: 'var(--fs-label)', letterSpacing: '0.14em', color: gold(0.5) }}>
          VOYAGER BENEFITS
        </span>
      </div>

      {/* Rows — all clickable, show detail modal on click */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {preview.map(({ icon, title, sublabel, body }, i) => {
          const isLast = i === preview.length - 1
          return (
            <div
              key={title}
              onClick={() => onItemClick({ title, sublabel, body })}
              style={{
                display: 'flex', alignItems: 'center', gap: 13,
                padding: '12px 18px',
                borderBottom: isLast ? 'none' : `1px solid ${gold(0.05)}`,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = gold(0.04) }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <div style={{
                width: 32, height: 32, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${gold(0.18)}`,
                background: gold(0.04),
                color: gold(0.42),
              }}>
                {icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.08em', marginBottom: 3, color: gold(0.62) }}>
                  {title}
                </div>
                <div style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.22)', letterSpacing: '0.04em' }}>
                  {sublabel}
                </div>
              </div>
              <div style={{ flexShrink: 0, color: gold(0.3) }}>
                <ArrowIcon size={11} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── VOYAGER welcome block (post-purchase) ────────────────────────────────────

function VoyagerWelcomeBlock({ onConsoleClick, onSignalClick }: { onConsoleClick: () => void; onSignalClick: () => void }) {
  const gold = (a: number) => `rgba(196,169,106,${a})`

  const capabilities: {
    icon: React.ReactNode
    label: string
    sublabel: string
    href: string | null
    locked: boolean
    onClickLocked?: () => void
  }[] = [
    {
      icon: <ConsoleIcon size={18} />,
      label: 'CONSOLE — PRIORITY APPLICATION',
      sublabel: 'First in line for limited hardware',
      href: null,
      locked: true,
      onClickLocked: onConsoleClick,
    },
    {
      icon: <IntelIcon />,
      label: 'INTEL & DECISIONS',
      sublabel: 'Access reports and shape Collective decisions',
      href: '/intel',
      locked: false,
    },
    {
      icon: <VoyagerIcon size={18} />,
      label: 'VOYAGER IDENTITY',
      sublabel: 'Your permanent number and cohort placement',
      href: '/profile',
      locked: false,
    },
    {
      icon: <SignalIcon />,
      label: 'SIGNAL ANALYSIS & DEVICE TRACKING',
      sublabel: 'Active field operations — coming soon',
      href: null,
      locked: true,
      onClickLocked: onSignalClick,
    },
  ]

  return (
    <div className="dd-panel" style={{
      ['--dd-bd' as string]: gold(0.4),
      ['--dd-fill' as string]: '#13152C',
      animation: 'voyager-welcome-in 0.35s ease-out',
    }}>
      <i className="dd-node" />
      <i className="dd-dash" />

      {/* ── Header ── */}
      <div style={{
        padding: '14px 18px 13px',
        borderBottom: `1px solid ${gold(0.1)}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ color: gold(0.7) }}><VoyagerIcon size={16} /></div>
        <span style={{ fontSize: 'var(--fs-label)', letterSpacing: '0.12em', color: gold(0.75) }}>
          VOYAGER — ACTIVE ACCESS
        </span>
      </div>

      {/* ── Capability rows: title + sublabel only ── */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {capabilities.map(({ icon, label, sublabel, href, locked, onClickLocked }, i) => {
          const isLast = i === capabilities.length - 1
          const baseStyle: React.CSSProperties = {
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '13px 18px',
            borderBottom: isLast ? 'none' : `1px solid ${locked ? 'rgba(255,255,255,0.04)' : gold(0.07)}`,
            textDecoration: 'none',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'background 0.15s',
            width: '100%', textAlign: 'left',
            fontFamily: 'var(--font-mono)',
          }

          const inner = (
            <>
              <div style={{
                width: 34, height: 34, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: locked ? '1px solid rgba(255,255,255,0.08)' : `1px solid ${gold(0.3)}`,
                background: locked ? 'rgba(255,255,255,0.02)' : gold(0.07),
                color: locked ? 'rgba(245,245,245,0.2)' : gold(0.65),
              }}>
                {icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.08em', marginBottom: 3, color: locked ? 'rgba(245,245,245,0.22)' : gold(0.82) }}>
                  {label}
                </div>
                <div style={{ fontSize: 'var(--fs-caption)', color: locked ? 'rgba(245,245,245,0.15)' : 'rgba(245,245,245,0.35)', letterSpacing: '0.05em' }}>
                  {sublabel}
                </div>
              </div>
              {/* locked items only show lock icon; unlocked items show nothing */}
              {locked && (
                <div style={{ flexShrink: 0, color: 'rgba(255,255,255,0.18)' }}>
                  <LockIcon size={13} />
                </div>
              )}
            </>
          )

          // Unlocked → direct navigation
          if (!locked && href) {
            return (
              <Link
                key={label}
                href={href}
                style={baseStyle}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = gold(0.06) }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                {inner}
              </Link>
            )
          }

          // Locked → modal on click
          return (
            <button key={label} onClick={onClickLocked} style={baseStyle}>
              {inner}
            </button>
          )
        })}
      </div>

      <style>{`
        @keyframes voyager-welcome-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VoyagerPathPage() {
  const { user } = useAuth()
  const [viewedStage, setViewedStage] = useState<ViewStage>('applicant')
  const [modal, setModal]             = useState<ModalKind | null>(null)
  const [detailItem, setDetailItem]   = useState<BenefitDetail | null>(null)
  const [status, setStatus]           = useState<VoyagerPathStatus | null>(null)
  // Preview override: /voyager-path?view=applicant forces the Applicant 3-task
  // track even for voyager/architect, so the task_gated experience can be QA'd
  // without an applicant account.
  const [forceApplicant, setForceApplicant] = useState(false)

  // Live task state for the signed-in user (sighting · quiz · pack), any order.
  useEffect(() => {
    getVoyagerPathStatus().then(setStatus).catch(() => {})
    // Read the client-only ?view= override once after mount (avoids a hydration
    // mismatch from reading window during render).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only URL read post-mount
    setForceApplicant(new URLSearchParams(window.location.search).get('view') === 'applicant')
  }, [])

  const completed: Record<TaskKey, boolean> = {
    report_sighting: status?.sighting ?? false,
    pass_quiz:       status?.quiz ?? false,
    get_pack:        status?.pack ?? false,
  }
  const completedCount = Object.values(completed).filter(Boolean).length
  const totalTasks     = TASKS.length
  const allDone        = status?.allDone ?? false
  const isVoyager      = !forceApplicant && (user.role === 'voyager' || user.role === 'architect')

  function handleStageClick(stage: ViewStage) {
    if (stage === 'console') {
      setModal('console_locked')
    } else {
      setViewedStage(stage)
    }
  }

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: 'var(--color-deep)', fontFamily: 'var(--font-mono)' }}>

      {/* ── Modals ── */}
      <Modal kind={modal} onClose={() => setModal(null)} />
      {detailItem && <BenefitDetailModal item={detailItem} onClose={() => setDetailItem(null)} />}

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* ── YOUR PATH ── */}
        <section style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.3)', letterSpacing: '0.22em' }}>— YOUR PATH —</span>
          </div>
          <PathRail
            allDone={allDone}
            isVoyager={isVoyager}
            viewedStage={viewedStage}
            onStageClick={handleStageClick}
            onConsoleClick={() => setModal('console_locked')}
          />
        </section>

        {/* ── Stage-specific content ── */}
        <section style={{ marginBottom: 16 }}>
          {isVoyager ? (
            <VoyagerWelcomeBlock onConsoleClick={() => setModal('console_locked')} onSignalClick={() => setModal('signal_locked')} />
          ) : viewedStage === 'applicant' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.3)', letterSpacing: '0.22em' }}>— BECOME A VOYAGER —</span>
                <span style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.1em', color: allDone ? '#20D890' : 'rgba(245,245,245,0.3)' }}>
                  {allDone ? 'VOYAGER UNLOCKED ✦' : `${completedCount} / ${totalTasks} COMPLETE`}
                </span>
              </div>
              <VoyagerUnlockTrack
                completed={completed}
                allDone={allDone}
                doneCount={completedCount}
              />
            </>
          ) : (
            <VoyagerStageContent onItemClick={setDetailItem} />
          )}
        </section>

      </div>

      <style>{`
        @keyframes badge-in {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }

        /* ── ui-kit candidate HUD restyle — notched panel ──
           Two clipped layers: ::before = border, ::after = fill (inset by border
           width). Signature decorations: BL square node + right-edge dashed tick. */
        .dd-panel {
          position: relative;
          --dd-notch: 15px;
          --dd-bw: 1.5px;
          --dd-bd: rgba(255,107,53,0.3);
          --dd-fill: var(--bg-panel);
        }
        .dd-panel::before {
          content: ''; position: absolute; inset: 0; z-index: 0;
          background: var(--dd-bd);
          clip-path: polygon(var(--dd-notch) 0, 100% 0, 100% calc(100% - var(--dd-notch)), calc(100% - var(--dd-notch)) 100%, 0 100%, 0 var(--dd-notch));
          transition: background 0.4s;
        }
        .dd-panel::after {
          content: ''; position: absolute; inset: var(--dd-bw); z-index: 0;
          background: var(--dd-fill);
          clip-path: polygon(calc(var(--dd-notch) - var(--dd-bw)) 0, 100% 0, 100% calc(100% - var(--dd-notch) + var(--dd-bw)), calc(100% - var(--dd-notch) + var(--dd-bw)) 100%, 0 100%, 0 calc(var(--dd-notch) - var(--dd-bw)));
          transition: background 0.3s;
        }
        /* lift real content above the two clip layers */
        .dd-panel > *:not(.dd-node):not(.dd-dash):not(style) {
          position: relative; z-index: 1;
        }
        /* BL square node */
        .dd-node {
          position: absolute; z-index: 2; left: 0; bottom: 0;
          width: 6px; height: 6px; background: var(--dd-bd); pointer-events: none;
          transition: background 0.4s;
        }
        /* right-edge dashed tick, near the top */
        .dd-dash {
          position: absolute; z-index: 2; right: 2px; top: 14px;
          width: 1.6px; height: 30px; pointer-events: none; opacity: 0.9;
          background: repeating-linear-gradient(180deg, var(--dd-bd) 0 3.5px, transparent 3.5px 7px);
          transition: background 0.4s;
        }
      `}</style>
    </div>
  )
}
