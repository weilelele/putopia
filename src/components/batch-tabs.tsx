'use client'
import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ArchiveTabs, type ArchiveTabItem } from './archive-tabs'
import { ArchiveButton } from './archive-button'
export function BatchTabs({activeId,items,onChange}: {activeId:string;items:ArchiveTabItem[];onChange:(id:string)=>void}) {
  const rail = useRef<HTMLDivElement>(null)
  const index = items.findIndex(item=>item.id === activeId)
  useEffect(()=>{
    const container = rail.current
    const selected = container?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!container || !selected) return
    const parent = container.getBoundingClientRect(), child = selected.getBoundingClientRect()
    if (child.left < parent.left) container.scrollBy({left:child.left-parent.left,behavior:'instant'})
    else if (child.right > parent.right) container.scrollBy({left:child.right-parent.right,behavior:'instant'})
  },[activeId])
  return <div className="batch-selector">
    <ArchiveTabs activeId={activeId} ariaLabel="Voyager batches" containerRef={rail} items={items} onChange={onChange} />
    {items.length > 1 && <div className="batch-selector-controls"><ArchiveButton variant="ghost" aria-label="Previous batch" disabled={index <= 0} onClick={()=>onChange(items[index-1].id)}><ChevronLeft aria-hidden size={18} /></ArchiveButton><ArchiveButton variant="ghost" aria-label="Next batch" disabled={index < 0 || index >= items.length-1} onClick={()=>onChange(items[index+1].id)}><ChevronRight aria-hidden size={18} /></ArchiveButton></div>}
  </div>
}
