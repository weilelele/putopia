'use client'

import { useState } from 'react'
import { ArchiveTabs } from '@/components/archive-tabs'

const TABS = [
  { id: 'architects', label: 'Architects', count: 6 },
  { id: 'new-batch', label: 'New Batch', count: 53 },
  { id: 'all-voyagers', label: 'All Voyagers', count: 66 },
]

export function ArchiveTabsDemo() {
  const [activeId, setActiveId] = useState(TABS[0].id)
  return <ArchiveTabs activeId={activeId} ariaLabel="Archive tab example" items={TABS} onChange={setActiveId} />
}
