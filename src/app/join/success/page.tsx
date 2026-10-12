import { deviceSourcePath, initiationReturnPath } from '@/app/voyager-initiation/navigation'
import { getInitiationSnapshot } from '@/lib/actions/initiation'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchivePageHeader } from '@/components/archive-page-header'
export const dynamic = 'force-dynamic'
export default async function JoinSuccessPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const source = deviceSourcePath((await searchParams).from)
  const returnPath = initiationReturnPath(source)
  const snapshot = await getInitiationSnapshot()
  const paid = snapshot.status === 'initiated'
  return <main className="main join-success-page"><div className="join-success-shell"><ArchiveCard className="join-success-card">
    <ArchivePageHeader title={paid ? 'WELCOME TO S26' : 'PAYMENT STATUS'} accent={paid ? 'INITIATION CONFIRMED' : 'VIEW YOUR RECORDS'} />
    <p className="join-success-copy">{snapshot.error ?? (!snapshot.userId
      ? 'Log in to view your payment and fulfillment records.'
      : paid ? 'Your Initiation payment is confirmed. Your four Pack records and Console entitlement are available in Initiation.'
      : snapshot.paymentStatus === 'refunded' || snapshot.paymentStatus === 'disputed' ? 'Your payment has been refunded or is under review. Please view your records for the current entitlement status.'
      : snapshot.legacyPackPurchased ? 'Your Initial Pack membership includes the first two Packs. Your upgrade payment has not been confirmed; check Initiation for its status.'
      : 'Your payment has not yet been confirmed. Returning from checkout does not activate membership. Check Initiation for the latest status.')}</p>
    <ArchiveLinkButton href={snapshot.userId ? returnPath : `/login?redirect=${encodeURIComponent(returnPath)}`} fullWidth variant="primary">{snapshot.userId ? 'VIEW INITIATION' : 'LOG IN'}</ArchiveLinkButton>
  </ArchiveCard></div></main>
}
