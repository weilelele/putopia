import { initiationPriceLabel } from '@/lib/initiation-pricing'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchivePageHeader } from '@/components/archive-page-header'
export default function VoyagerPackPage() {
  return <main className="main join-success-page"><div className="join-success-shell"><ArchiveCard>
    <ArchivePageHeader title="INITIAL VOYAGER PACK" accent={initiationPriceLabel('initial')} />
    <p>The Initial Voyager Pack is {initiationPriceLabel('initial')}: Voyager member access, a welcome letter, badge and Mysterious Widgets. Console + Pack 4 can be added later for {initiationPriceLabel('legacy_upgrade')}.</p>
    <p>Historical $12 orders and their delivery commitments remain intact. These members also pay $460 for a new Console + Pack 4 upgrade. Existing completed payments keep their original amount.</p>
    <ArchiveLinkButton href="/voyager-initiation" fullWidth variant="primary">CHOOSE A PACK &amp; VIEW MY RECORDS</ArchiveLinkButton>
  </ArchiveCard></div></main>
}
