'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { mockClaimFirstPack } from '@/lib/actions/claim'
import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { ArchiveSectionLabel } from '@/components/archive-section-label'

const ORANGE = '#E35205'

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
    <div className="main archive-flow-main device-claim-page">
      <ArchiveBrandHeader />
      <div className="archive-flow-content archive-flow-content--wide">
        <div className="archive-flow-back">
          <ArchiveLinkButton href="/devices" variant="ghost">← DEVICE ARCHIVE</ArchiveLinkButton>
        </div>
        <ArchivePageHeader title="CAIRO" accent="BATCH 01" />
        <p className="archive-flow-summary">First parts pack · Antique markets, Cairo · Multiverse Console components</p>

      {/* Hero image (placeholder) */}
      <div className="device-claim-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMG}
          alt="Cairo Batch 01 — first parts pack"
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.7) brightness(0.7)' }}
        />
        <div className="absolute bottom-3 left-3 font-mono text-xs px-2 py-1" style={{ color: ORANGE, background: 'rgba(7,9,18,0.7)', border: `1px solid ${ORANGE}` }}>
          [ PLACEHOLDER · ASSET PENDING ]
        </div>
      </div>

      {/* Intel block */}
      <ArchiveCard className="device-claim-report">
        <ArchiveSectionLabel>FIELD REPORT</ArchiveSectionLabel>
        {INTEL_LINES.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </ArchiveCard>

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
      <section className="device-claim-benefits">
        <ArchiveSectionLabel>WHAT YOU RECEIVE</ArchiveSectionLabel>

        <div className="device-claim-benefit-grid">
          {BENEFITS.map((group) => (
            <ArchiveCard key={group.no} className="device-claim-benefit">
              <div className="flex items-baseline gap-2 mb-3 pb-2 border-b" style={{ borderColor: 'rgba(227,82,5,0.16)' }}>
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
            </ArchiveCard>
          ))}
        </div>
      </section>

      {/* Pricing + CTA */}
      <ArchiveCard className="device-claim-price">
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
          <ArchiveButton
            disabled={status === 'claiming'}
            fullWidth
            onClick={handleClaim}
          >
            {status === 'claiming'
              ? '[ PROCESSING… ]'
              : !isLoggedIn
              ? '[ LOG IN TO CLAIM ]'
              : !isApplicant
              ? '[ APPLY FIRST ]'
              : '[ LOCK IN MY DEVICE ]'}
          </ArchiveButton>
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
      </ArchiveCard>

      {/* Upgrade note */}
      <div
        className="mb-10 border-l-2 pl-4 font-mono text-xs"
        style={{ borderColor: 'rgba(227,82,5,0.4)', color: 'rgba(245,245,245,0.35)', lineHeight: '1.8', maxWidth: '640px' }}
      >
        <div style={{ color: 'rgba(245,245,245,0.5)', marginBottom: '0.25rem' }}>UPGRADE PATH</div>
        The $12 first parts pack is the entry point. If you later choose to secure the full
        Console (four consecutive batches, $360), your initial payment is credited toward the
        total. The first batch is identical across both tracks.
      </div>

      </div>
    </div>
  )
}
