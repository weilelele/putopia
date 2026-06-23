'use client'

import { useState } from 'react'
import type { ComponentProps } from 'react'
import { WorldPoster } from '@/components/world-poster'

type PosterWorld = ComponentProps<typeof WorldPoster>['world'] & { submitted_at?: string | null }

function formatSubmitted(submitted_at?: string | null) {
  return submitted_at
    ? new Date(submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
}

/**
 * Initial Vision grid with an incremental "More" reveal, so a long proposed-worlds
 * list doesn't push Signal Tuning off screen.
 *
 * Default (step 0): one row on PC, four items on mobile.
 *   mobile (2-col) 4 · lg (3-col) 3 · xl (4-col) 4
 * Each click reveals two more rows (≈6 on mobile/lg, 8 on xl):
 *   mobile/lg +6 · xl +8
 */
export function CollapsibleWorldGrid({ worlds }: { worlds: PosterWorld[] }) {
  const [step, setStep] = useState(0)

  const mobileVisible = 4 + 6 * step
  const lgVisible = 3 + 6 * step
  const xlVisible = 4 + 8 * step

  // lg shows the fewest at every step, so once it covers everything we're done.
  const fullyExpanded = lgVisible >= worlds.length
  const hasMore = worlds.length > 4

  const cellClass = (i: number) =>
    [
      i < mobileVisible ? 'block' : 'hidden',
      i < lgVisible ? 'lg:block' : 'lg:hidden',
      i < xlVisible ? 'xl:block' : 'xl:hidden',
    ].join(' ')

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {worlds.map((world, i) => (
          <div key={world.id} className={cellClass(i)}>
            <WorldPoster world={world} date={formatSubmitted(world.submitted_at)} />
          </div>
        ))}
      </div>
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '0.85rem' }}>
          <button
            onClick={() => setStep((s) => (fullyExpanded ? 0 : s + 1))}
            className="btn-ghost"
            style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.12em' }}
          >
            {fullyExpanded ? '▲ COLLAPSE' : `▼ MORE (${worlds.length})`}
          </button>
        </div>
      )}
    </>
  )
}
