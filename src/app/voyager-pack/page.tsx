import { ArchiveCard } from '@/components/archive-card'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchivePageHeader } from '@/components/archive-page-header'
export default function VoyagerPackPage() {
  return <main className="main join-success-page"><div className="join-success-shell"><ArchiveCard>
    <ArchivePageHeader title="INITIAL VOYAGER PACK" accent="SALES CLOSED" />
    <p>The $12 Initial Voyager Pack is no longer for sale. Existing orders and their original fulfillment commitments remain available in your records.</p>
    <p>Voyager Initiation is a separate program. Upgrade pricing and any credit for historical Pack purchases have not been confirmed.</p>
    <ArchiveLinkButton href="/voyager-initiation" fullWidth variant="primary">VIEW INITIATION &amp; MY PACKS</ArchiveLinkButton>
  </ArchiveCard></div></main>
}
