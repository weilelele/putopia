'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { mockClaimFirstPack } from '@/lib/actions/claim'

const ORANGE = '#FF6B35'

const INTEL_LINES = [
  'SOURCE   : Weile / Architect-on-site',
  'LOCATION : Cairo, Egypt — surrounding antique markets',
  'BATCH    : 01 / CAIRO-BATCH-01',
  'UNITS    : est. 100–300',
  'STATUS   : Survey in progress · Restoration underway',
]

// Placeholder hero — swap for real parts-pack render when assets land.
const HERO_IMG = 'https://picsum.photos/seed/cairo-batch-01/800/450'

interface BenefitGroup {
  no:    string
  title: string
  items: { label: string; desc: string }[]
}

const BENEFITS: BenefitGroup[] = [
  {
    no: '01',
    title: 'ACCESS & PERMISSIONS',
    items: [
      { label: 'Voyager status', desc: 'Your account is upgraded from Applicant to Voyager.' },
      { label: 'Profile + classified intel', desc: 'Edit your own Voyager page and unlock restricted briefings.' },
      { label: 'Expanded voting', desc: 'Take part in decisions reserved for full members.' },
    ],
  },
  {
    no: '02',
    title: 'PHYSICAL & HONORS',
    items: [
      { label: 'Initiation Seal', desc: 'The organization badge — your physical mark of entry.' },
      { label: 'First parts pack', desc: 'Cairo Batch 01 components, dispatched once restoration completes.' },
      { label: 'Letter of invitation', desc: 'A formal summons into the Collective, addressed to you.' },
    ],
  },
  {
    no: '03',
    title: 'TEST ELIGIBILITY',
    items: [
      { label: 'Early trait test', desc: 'Priority access to the Voyager trait diagnostic.' },
      { label: 'Match & lock a device', desc: 'Find the device that resonates with you and reserve it ahead of others.' },
    ],
  },
]

export default function ClaimPage() {
  const { user, isAtLeast } = useAuth()
  const [hovered, setHovered] = useState(false)
  const [status, setStatus] = useState<'idle' | 'claiming' | 'done' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  const isLoggedIn  = !!user.id
  const isApplicant = isAtLeast('applicant')
  const isVoyager   = isAtLeast('voyager') || status === 'done'

  async function handleClaim() {
    if (!isLoggedIn) {
      window.location.href = '/login?next=/devices/claim'
      return
    }
    if (!isApplicant) {
      window.location.href = '/apply'
      return
    }
    // PHASE 1: no Stripe yet — simulate a successful payment return.
    setStatus('claiming')
    setErrMsg('')
    const res = await mockClaimFirstPack()
    if (res.ok) {
      setStatus('done')
    } else {
      setStatus('error')
      setErrMsg(res.error ?? 'Something went wrong')
    }
  }

  return (
    <div className="main">

      {/* Top bar */}
      <div className="top-bar">
        <div className="crumbs">
          <Link href="/devices" style={{ color: 'inherit', textDecoration: 'none' }}>
            PC://CONSOLE / DEVICE ARCHIVE
          </Link>
          <span> /</span> CAIRO-BATCH-01
        </div>
        <div className="right">
          <div className="item">BATCH <span className="val">01</span></div>
          <div className="item">STATUS <span className="val" style={{ color: ORANGE }}>OPEN</span></div>
        </div>
      </div>

      {/* Page head */}
      <div className="page-head">
        <div>
          <div className="h-eyebrow">// FIRST DISCOVERY</div>
          <h1>CAIRO <span className="accent">BATCH 01</span></h1>
          <p className="sub">First parts pack · Antique markets, Cairo · Multiverse Console components</p>
        </div>
      </div>

      {/* Hero image (placeholder) */}
      <div
        className="mb-8 border overflow-hidden relative"
        style={{ borderColor: 'rgba(255,107,53,0.35)', aspectRatio: '16/7', maxWidth: '820px' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMG}
          alt="Cairo Batch 01 — first parts pack"
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.7) brightness(0.7)' }}
        />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(7,9,18,0.1), rgba(7,9,18,0.65))' }} />
        <div className="absolute bottom-3 left-3 font-mono text-xs px-2 py-1" style={{ color: ORANGE, background: 'rgba(7,9,18,0.7)', border: `1px solid ${ORANGE}` }}>
          [ PLACEHOLDER · ASSET PENDING ]
        </div>
      </div>

      {/* Intel block */}
      <div
        className="mb-8 border p-4 font-mono text-xs"
        style={{
          borderColor: 'rgba(255,107,53,0.3)',
          background: 'rgba(255,107,53,0.04)',
          color: 'rgba(245,245,245,0.55)',
          lineHeight: '1.9',
          maxWidth: '820px',
        }}
      >
        <div className="mb-2" style={{ color: ORANGE }}>// FIELD REPORT</div>
        {INTEL_LINES.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>

      {/* Narrative */}
      <div className="mb-10" style={{ maxWidth: '640px' }}>
        <p className="font-mono text-sm leading-loose mb-4" style={{ color: 'rgba(245,245,245,0.7)' }}>
          Our architect has been surveying antique shops in and around Cairo. The initial
          collection is estimated at between 100 and 300 units — devices whose origin and
          purpose remain partially unknown.
        </p>
        <p className="font-mono text-sm leading-loose mb-4" style={{ color: 'rgba(245,245,245,0.7)' }}>
          Alongside the hardware, we have recovered a number of ancient antennas. These were
          originally designed to receive signals from specific worlds. Our architect has
          developed specialized components to replace and integrate them into the Cairo units.
        </p>
        <p className="font-mono text-sm leading-loose" style={{ color: 'rgba(245,245,245,0.45)' }}>
          Restoration is underway. The first parts pack can be secured now. Your device will
          be dispatched once the calibration phase is complete.
        </p>
      </div>

      {/* What you receive — 3 benefit groups */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-5">
          <span className="label-tag" style={{ color: ORANGE, borderColor: ORANGE }}>WHAT YOU RECEIVE</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,107,53,0.16)' }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {BENEFITS.map((group) => (
            <div
              key={group.no}
              className="border p-4"
              style={{ borderColor: 'rgba(255,107,53,0.2)', background: 'rgba(15,20,48,0.6)' }}
            >
              <div className="flex items-baseline gap-2 mb-3 pb-2 border-b" style={{ borderColor: 'rgba(255,107,53,0.16)' }}>
                <span className="font-mono font-bold" style={{ color: ORANGE, fontSize: '0.9rem' }}>{group.no}</span>
                <span className="font-mono text-xs font-bold tracking-wider" style={{ color: '#F5F5F5' }}>{group.title}</span>
              </div>
              <ul className="space-y-3">
                {group.items.map((item) => (
                  <li key={item.label}>
                    <div className="text-xs font-mono font-semibold mb-0.5" style={{ color: ORANGE }}>
                      + {item.label}
                    </div>
                    <div className="text-xs font-mono" style={{ color: 'rgba(245,245,245,0.5)', lineHeight: '1.55' }}>
                      {item.desc}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing + CTA */}
      <div
        className="border p-5 mb-10"
        style={{ borderColor: ORANGE, background: 'rgba(255,107,53,0.04)', maxWidth: '400px', boxShadow: '0 0 18px rgba(255,107,53,0.18)' }}
      >
        <div className="flex items-baseline gap-3 mb-1">
          <span className="font-mono font-bold" style={{ fontSize: '2rem', color: '#F5F5F5', letterSpacing: '-0.02em' }}>$12</span>
          <span className="text-xs font-mono" style={{ color: 'rgba(245,245,245,0.35)' }}>USD · one-time · free shipping</span>
        </div>
        <div className="text-xs font-mono mb-5" style={{ color: 'rgba(245,245,245,0.3)' }}>
          China region: ¥90 including shipping
        </div>

        {isVoyager ? (
          <div
            className="w-full py-2.5 text-xs font-mono tracking-widest border text-center"
            style={{ borderColor: ORANGE, color: '#070912', background: ORANGE, fontWeight: 700 }}
          >
            ✦ VOYAGER STATUS ACTIVE
          </div>
        ) : (
          <button
            disabled={status === 'claiming'}
            className="w-full py-2.5 text-xs font-mono tracking-widest border transition-all"
            style={{
              borderColor: ORANGE,
              color: hovered && status !== 'claiming' ? '#070912' : (status === 'claiming' ? 'rgba(245,245,245,0.4)' : ORANGE),
              background: status === 'claiming' ? 'transparent' : (hovered ? '#F5F5F5' : ORANGE),
              fontWeight: 700,
              cursor: status === 'claiming' ? 'wait' : 'pointer',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={handleClaim}
          >
            {status === 'claiming'
              ? '[ PROCESSING… ]'
              : !isLoggedIn
              ? '[ LOG IN TO CLAIM ]'
              : !isApplicant
              ? '[ APPLY FIRST ]'
              : '[ LOCK IN MY DEVICE ]'}
          </button>
        )}

        {status === 'done' && (
          <p className="text-xs font-mono mt-3" style={{ color: ORANGE, lineHeight: 1.6 }}>
            ✦ Payment confirmed (simulated). You are now a Voyager. The trait test is unlocked.
          </p>
        )}
        {status === 'error' && (
          <p className="text-xs font-mono mt-3" style={{ color: '#E83030' }}>
            {errMsg}
          </p>
        )}

        {!isLoggedIn && (
          <p className="text-xs font-mono mt-3" style={{ color: 'rgba(245,245,245,0.3)' }}>
            No account yet?{' '}
            <Link href="/apply" style={{ color: ORANGE, textDecoration: 'none' }}>
              Apply to join the organization →
            </Link>
          </p>
        )}
      </div>

      {/* Upgrade note */}
      <div
        className="mb-10 border-l-2 pl-4 font-mono text-xs"
        style={{ borderColor: 'rgba(255,107,53,0.4)', color: 'rgba(245,245,245,0.35)', lineHeight: '1.8', maxWidth: '640px' }}
      >
        <div style={{ color: 'rgba(245,245,245,0.5)', marginBottom: '0.25rem' }}>// UPGRADE PATH</div>
        The $12 first parts pack is the entry point. If you later choose to secure the full
        Console (four consecutive batches, $360), your initial payment is credited toward the
        total. The first batch is identical across both tracks.
      </div>

      {/* Footer */}
      <div className="footer-bar" style={{ marginTop: '2rem' }}>
        <Link href="/devices" className="font-mono text-xs" style={{ color: 'rgba(245,245,245,0.35)', textDecoration: 'none' }}>
          ← BACK TO DEVICE ARCHIVE
        </Link>
        <div>CAIRO-BATCH-01 · CLAIM v1.0</div>
      </div>

    </div>
  )
}
