'use client'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { RootBrandHeader } from '@/components/root-brand-header'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import styles from './feed.module.css'
export function VoyagerHeader({ tab, showBrand = true, profile = true }: { tab: 'feed' | 'members' | 'logs'; showBrand?: boolean; profile?: boolean }) {
  return <><h1 className="sr-only">Voyagers</h1>{showBrand && <RootBrandHeader>{profile && <ArchiveLinkButton href="/profile" variant="ghost">MY PROFILE <ArrowRight size={18} aria-hidden /></ArchiveLinkButton>}</RootBrandHeader>}
    <nav aria-label="Voyagers sections" className={styles.tabs}>{(['feed','members','logs'] as const).map(item => <Link key={item} href={item === 'feed' ? '/voyagers' : `/voyagers?tab=${item}`} aria-current={item === tab ? 'page' : undefined}>{item.toUpperCase()}</Link>)}</nav>
  </>
}
