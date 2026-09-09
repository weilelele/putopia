'use client'

import { useId, useState } from 'react'
import { ArchiveStatStrip } from '@/components/archive-stat-strip'

const DESCRIPTIONS = {
  worlds: 'The parallel worlds recorded by the Collective, including those imagined by its members, as well as those now being stably observed via the Multiverse Console.',
  devices: 'The number of Multiverse Consoles currently collected, deployed, or undergoing repairs by the Collective. It is expected to continue growing steadily.',
  voyagers: 'Official voyagers and architects of the Collective, plus the applicants currently in line for a Multiverse Console.',
}

export function DashboardStats({ stats }: { stats: { worlds: number; voyagers: number } | null }) {
  const [active, setActive] = useState<keyof typeof DESCRIPTIONS | null>(null)
  const descriptionId = useId()
  const items = [
    { key: 'worlds' as const, label: 'PARALLEL WORLDS', value: stats?.worlds ?? '—' },
    { key: 'devices' as const, label: 'DEVICES', value: '?' },
    { key: 'voyagers' as const, label: 'VOYAGERS', value: stats?.voyagers ?? '—' },
  ]

  return <section className="dashboard-stats" aria-label="Collective overview">
    <ArchiveStatStrip items={items.map(({ key, label, value }) => ({
      label, value, expanded: active === key, controls: descriptionId,
      onSelect: () => setActive(current => current === key ? null : key),
    }))} />
    <div id={descriptionId} hidden={!active} className="dashboard-stats__description">
      {active && <p>{DESCRIPTIONS[active]}</p>}
    </div>
  </section>
}
