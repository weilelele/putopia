import { deviceSourcePath, initiationReturnPath } from '@/app/voyager-initiation/navigation'
import { getInitiationSnapshot } from '@/lib/actions/initiation'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { PostPaymentCalibration } from '@/app/voyager-initiation/post-payment-calibration'
import { hasConfirmedInitiationPayment } from '@/lib/post-payment-calibration'
import { PaymentStatusRefresh } from './payment-status-refresh'
import { needsRegistration } from '@/lib/registration-state'
export const dynamic = 'force-dynamic'
export default async function JoinSuccessPage({ searchParams }: { searchParams: Promise<{ from?: string; session_id?: string }> }) {
  const params = await searchParams
  const source = deviceSourcePath(params.from)
  // Email checkout returns signed out: the buyer has paid and activates the account from the emailed link.
  const fromCheckout = typeof params.session_id === 'string' && params.session_id.startsWith('cs_')
  const returnPath = initiationReturnPath(source)
  const snapshot = await getInitiationSnapshot()
  const paid = hasConfirmedInitiationPayment(snapshot)
  // Buyers who signed up with an email code at checkout have no name or password yet; setting them up is optional.
  const setUpAccount = snapshot.userId ? await needsRegistration(snapshot.userId).catch(() => false) : false
  return <main className="main join-success-page"><div className="join-success-shell"><ArchiveCard className="join-success-card">
    <ArchivePageHeader title={paid ? 'WELCOME TO S26' : 'PAYMENT STATUS'} accent={paid ? 'INITIATION CONFIRMED' : 'VIEW YOUR RECORDS'} />
    <p className="join-success-copy">{snapshot.error ?? (!snapshot.userId
      ? fromCheckout ? 'Payment received. Open the activation link we emailed you and set your password to see your membership, delivery and Console records. Already activated? Log in.' : 'Log in to view your payment and fulfillment records.'
      : paid ? snapshot.purchaseKind === 'initial'
        ? 'Your Initial Voyager Pack payment is confirmed. Your membership and first two Pack records are available in Initiation. Console + Pack 4 can be added later for $460.'
        : 'Your Initiation payment is confirmed. Your four Pack records and Console entitlement are available in Initiation.'
      : snapshot.paymentStatus === 'refunded' || snapshot.paymentStatus === 'disputed' ? 'Your payment has been refunded or is under review. Please view your records for the current entitlement status.'
      : snapshot.legacyPackPurchased && snapshot.paymentStatus === 'paid' ? 'Your Initial Voyager Pack payment is confirmed. Your first two Pack records are available in Initiation. Console + Pack 4 can be added later for $460.'
      : snapshot.legacyPackPurchased ? 'Your Initial Pack membership includes the first two Packs. Your upgrade payment has not been confirmed; check Initiation for its status.'
      : 'Your payment has not yet been confirmed. Returning from checkout does not activate membership. Check Initiation for the latest status.')}</p>
    <PaymentStatusRefresh pending={!!snapshot.userId && snapshot.paymentStatus === 'pending'} />
    <PostPaymentCalibration snapshot={snapshot} showResume environment={process.env.VERCEL_ENV ?? 'unknown'} />
    {setUpAccount && <>
      <p className="join-success-copy">Add a display name and password to finish activating your account.</p>
      <ArchiveLinkButton href={`/register?redirect=${encodeURIComponent(returnPath)}`} fullWidth variant="secondary">SET UP YOUR ACCOUNT</ArchiveLinkButton>
    </>}
    <div className="join-success-actions">{snapshot.userId
      ? <ArchiveLinkButton href={returnPath} fullWidth variant="primary">VIEW INITIATION</ArchiveLinkButton>
      : <ArchiveLinkButton href={`/login?redirect=${encodeURIComponent(returnPath)}`} fullWidth variant="primary">LOG IN</ArchiveLinkButton>}</div>
  </ArchiveCard></div></main>
}
