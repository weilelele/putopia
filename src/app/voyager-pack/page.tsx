import { initiationPriceLabel } from '@/lib/initiation-pricing'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchivePageHeader } from '@/components/archive-page-header'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Initial Voyager Pack · Multiverse Collective',
  description: `The Initial Voyager Pack (${initiationPriceLabel('initial')}) includes Voyager member access, a welcome letter, badge and Antenna for the Multiverse Console, the retro sci-fi device at the heart of Multiverse Collective. The Console is not included.`,
}
export default function VoyagerPackPage() {
  return <main className="main join-success-page"><div className="join-success-shell"><ArchiveCard>
    <ArchivePageHeader title="INITIAL VOYAGER PACK" accent={initiationPriceLabel('initial')} />
    <p>The Initial Voyager Pack is {initiationPriceLabel('initial')}: Voyager member access, a welcome letter, badge and Antenna for Multiverse Console. The Antenna must be installed on a Multiverse Console to receive signals. Initial does not include the Console. Console + Pack 4 can be added later for {initiationPriceLabel('legacy_upgrade')}.</p>
    <p>Historical $12 orders and their delivery commitments remain intact. These members also pay $460 for a new Console + Pack 4 upgrade. Existing completed payments keep their original amount.</p>
    <ArchiveLinkButton href="/voyager-initiation" fullWidth variant="primary">CHOOSE A PACK &amp; VIEW MY RECORDS</ArchiveLinkButton>
  </ArchiveCard></div></main>
}
