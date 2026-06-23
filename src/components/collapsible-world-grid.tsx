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
 * Grid of world posters that collapses to a short preview with a "More" toggle
 * (Voyager-style), so a long Initial Vision list doesn't push Signal Tuning off
 * screen. Collapsed shows: mobile (2-col) 6 = 3 rows, lg (3-col) 6 = 2 rows,
 * xl (4-col) 8 = 2 rows. The 7th/8th cells reveal only at xl to fill its 2nd row.
 */
export function CollapsibleWorldGrid({ worlds }: { worlds: PosterWorld[] }) {
  const [expanded, setExpanded] = useState(false)
  const hasMore = worlds.length > 6

  const cellClass = (i: number) => {
    if (expanded || i < 6) return ''
    if (i < 8) return 'hidden xl:block' // fill the 2nd row only on 4-col layouts
    return 'hidden'
  }

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
            onClick={() => setExpanded((e) => !e)}
            className="btn-ghost"
            style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.12em' }}
          >
            {expanded ? '▲ COLLAPSE' : `▼ MORE (${worlds.length})`}
          </button>
        </div>
      )}
    </>
  )
}
