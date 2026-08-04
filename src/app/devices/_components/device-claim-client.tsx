'use client'

import { Suspense, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import { formatBatchPrice, type DeviceBatch } from '@/lib/device-batches'

const ORANGE = '#E35205'

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

export function DeviceClaimClient({ batch }: { batch: DeviceBatch }) {
  return (
    <Suspense fallback={null}>
      <ClaimPageContent batch={batch} />
    </Suspense>
  )
}

function ClaimPageContent({ batch }: { batch: DeviceBatch }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAtLeast } = useAuth()
  const [status, setStatus] = useState<'idle' | 'claiming' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')
  const claimPrice = batch.claimPrice
  const intelLines = [
    `SOURCE   : ${batch.lead.name} / ${batch.lead.role}`,
    `LOCATION : ${batch.location}`,
    `BATCH    : ${batch.code}`,
    `PACKS    : ${batch.distributionStages.length}`,
    `STATUS   : ${batch.statusLine}`,
  ]

  const isLoggedIn  = !!user.id
  const isApplicant = isAtLeast('applicant')

  async function handleClaim() {
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(
        `${window.location.pathname}${window.location.search}`,
      )}`)
      return
    }
    if (!isApplicant) {
      router.push('/apply')
      return
    }
    setStatus('claiming')
    setErrMsg('')
    try {
      const response = await fetch('/api/device-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ batchSlug: batch.slug }),
      })
      const result = (await response.json()) as { url?: string; error?: string }

      if (response.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent(
          `${window.location.pathname}${window.location.search}`,
        )}`)
        return
      }
      if (response.status === 403) {
        router.push('/apply')
        return
      }
      if (!response.ok || !result.url) {
        throw new Error(result.error ?? 'Could not start secure checkout')
      }
      window.location.assign(result.url)
    } catch (error) {
      setStatus('error')
      setErrMsg(error instanceof Error ? error.message : 'Something went wrong')
    }
  }

  return (
    <div className="main archive-flow-main device-claim-page">
      <ArchiveBrandHeader />
      <div className="archive-flow-content archive-flow-content--wide">
        <div className="archive-flow-back">
          <ArchiveLinkButton href={`/devices/batches/${batch.slug}`} variant="ghost">
            ← BATCH RECORD
          </ArchiveLinkButton>
        </div>
        <ArchivePageHeader title={batch.name} accent="CLAIM" />
        <p className="archive-flow-summary">
          {batch.location} · {batch.distributionStages.length} configured packs
        </p>
        {searchParams.get('checkout') === 'cancelled' && (
          <div className="device-claim-notice" role="status">
            Checkout was cancelled. No payment was taken and this batch remains available to claim.
          </div>
        )}

      <div className="device-claim-hero">
        <Image
          alt={batch.imageAlt}
          fill
          priority
          sizes="(max-width: 767px) 100vw, 800px"
          src={batch.image}
          style={{ objectFit: batch.imageFit ?? 'cover' }}
        />
      </div>

      {/* Intel block */}
      <ArchiveCard className="device-claim-report">
        <ArchiveSectionLabel>FIELD REPORT</ArchiveSectionLabel>
        {intelLines.map((line) => (
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
          <span className="font-mono font-bold" style={{ fontSize: '2rem', color: '#F5F5F5', letterSpacing: '-0.02em' }}>
            {claimPrice ? formatBatchPrice(claimPrice) : 'PRICE PENDING'}
          </span>
        </div>
        <div className="text-xs font-mono mb-5" style={{ color: 'rgba(245,245,245,0.3)' }}>
          {claimPrice?.description ?? 'Pricing will be confirmed before claims open.'}
        </div>

        <ArchiveButton
          disabled={status === 'claiming' || !claimPrice}
          fullWidth
          onClick={handleClaim}
        >
          {status === 'claiming'
            ? '[ OPENING SECURE CHECKOUT… ]'
            : !isLoggedIn
            ? '[ LOG IN TO CLAIM ]'
            : !isApplicant
            ? '[ APPLY FIRST ]'
            : '[ CONTINUE TO PAYMENT ]'}
        </ArchiveButton>

        {status === 'error' && (
          <p className="device-claim-error" role="alert">
            {errMsg}
          </p>
        )}

        <p className="device-claim-payment-note">
          Shipping details and payment are completed securely with Stripe. Your claim is
          activated only after payment is verified.
        </p>

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
        This claim uses the price configured for <strong>{batch.code}</strong>. Final checkout
        will confirm shipping details and every configured distribution pack.
      </div>

      </div>
    </div>
  )
}
