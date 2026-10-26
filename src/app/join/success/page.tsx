import { deviceSourcePath, initiationReturnPath } from '@/app/voyager-initiation/navigation'
import { ConfirmGuestEmail } from '@/app/voyager-initiation/confirm-guest-email'
import { ClaimGuestPurchase } from '@/app/voyager-initiation/claim-guest-purchase'
import { hasRegisteredAccount } from '@/lib/guest-claim'
import { getInitiationSnapshot } from '@/lib/actions/initiation'
import { getStripe } from '@/lib/stripe'
import { normalizeGuestEmail } from '@/lib/guest-checkout'
import { INITIATION_PRODUCT } from '@/lib/initiation-types'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { PostPaymentCalibration } from '@/app/voyager-initiation/post-payment-calibration'
import { hasConfirmedInitiationPayment } from '@/lib/post-payment-calibration'
import { PaymentStatusRefresh } from './payment-status-refresh'
export const dynamic = 'force-dynamic'

/** The email typed at Stripe, only when that Checkout Session belongs to this buyer. */
async function checkoutEmail(sessionId: string | undefined, userId: string): Promise<string> {
  if (!sessionId?.startsWith('cs_')) return ''
  try {
    const session = await getStripe()!.checkout.sessions.retrieve(sessionId)
    if (session.metadata?.product_type !== INITIATION_PRODUCT || session.metadata.user_id !== userId) return ''
    return normalizeGuestEmail(session.customer_details?.email) ?? ''
  } catch {
    return ''
  }
}

export default async function JoinSuccessPage({ searchParams }: { searchParams: Promise<{ from?: string; session_id?: string }> }) {
  const query = await searchParams
  const source = deviceSourcePath(query.from)
  const returnPath = initiationReturnPath(source)
  const snapshot = await getInitiationSnapshot({ allowAnonymous: true })
  const paid = hasConfirmedInitiationPayment(snapshot)
  const guestEmail = snapshot.anonymous && snapshot.userId ? await checkoutEmail(query.session_id, snapshot.userId) : null
  // A returning member who paid without logging in claims the purchase instead of confirming a new email.
  const existingAccount = !!guestEmail && await hasRegisteredAccount(guestEmail).catch(() => false)
  return <main className="main join-success-page"><div className="join-success-shell"><ArchiveCard className="join-success-card">
    <ArchivePageHeader title={paid ? 'WELCOME TO S26' : 'PAYMENT STATUS'} accent={paid ? 'INITIATION CONFIRMED' : 'VIEW YOUR RECORDS'} />
    <p className="join-success-copy">{snapshot.error ?? (!snapshot.userId
      ? 'Log in to view your payment and fulfillment records.'
      : paid ? snapshot.purchaseKind === 'initial'
        ? 'Your Initial Voyager Pack payment is confirmed. Your membership and first two Pack records are available in Initiation. Console + Pack 4 can be added later for $460.'
        : 'Your Initiation payment is confirmed. Your four Pack records and Console entitlement are available in Initiation.'
      : snapshot.paymentStatus === 'refunded' || snapshot.paymentStatus === 'disputed' ? 'Your payment has been refunded or is under review. Please view your records for the current entitlement status.'
      : snapshot.legacyPackPurchased && snapshot.paymentStatus === 'paid' ? 'Your Initial Voyager Pack payment is confirmed. Your first two Pack records are available in Initiation. Console + Pack 4 can be added later for $460.'
      : snapshot.legacyPackPurchased ? 'Your Initial Pack membership includes the first two Packs. Your upgrade payment has not been confirmed; check Initiation for its status.'
      : 'Your payment has not yet been confirmed. Returning from checkout does not activate membership. Check Initiation for the latest status.')}</p>
    {guestEmail !== null && <div className="join-success-copy">{existingAccount ? <ClaimGuestPurchase email={guestEmail} /> : <ConfirmGuestEmail defaultEmail={guestEmail} />}</div>}
    <PaymentStatusRefresh pending={!!snapshot.userId && snapshot.paymentStatus === 'pending'} />
    <PostPaymentCalibration snapshot={snapshot} showResume environment={process.env.VERCEL_ENV ?? 'unknown'} />
    <ArchiveLinkButton href={snapshot.userId ? returnPath : `/login?redirect=${encodeURIComponent(returnPath)}`} fullWidth variant={guestEmail !== null ? 'secondary' : 'primary'}>{snapshot.userId ? 'VIEW INITIATION' : 'LOG IN'}</ArchiveLinkButton>
  </ArchiveCard></div></main>
}
