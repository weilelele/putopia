import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { getMyDeviceOrderBySession } from '@/lib/actions/orders'
import { formatStripeMinorUnits } from '@/lib/device-checkout'
import { getPublicDeviceBatch } from '@/lib/device-batch-repository'

export const dynamic = 'force-dynamic'

type SuccessPageProps = {
  searchParams: Promise<{ session_id?: string | string[] }>
}

export default async function DeviceClaimSuccessPage({ searchParams }: SuccessPageProps) {
  const query = await searchParams
  const sessionId = typeof query.session_id === 'string' ? query.session_id : ''
  const order = sessionId ? await getMyDeviceOrderBySession(sessionId) : null
  const batch = order?.device_batch_slug
    ? await getPublicDeviceBatch(order.device_batch_slug)
    : undefined
  const confirmed = !!order && ['paid', 'preparing', 'shipped', 'delivered'].includes(order.status)
  const pending = order?.status === 'pending'

  return (
    <main className="main join-success-page">
      <div className="join-success-shell">
        <ArchiveBrandHeader />
        <ArchiveCard className="join-success-card device-claim-success-card">
          <ArchivePageHeader
            accent={confirmed ? 'SECURED.' : pending ? 'PROCESSING.' : 'UNVERIFIED.'}
            title="BATCH CLAIM"
          />

          <p className="join-success-copy">
            {confirmed
              ? `${batch?.name ?? order?.device_batch_code ?? 'Your device'} is now attached to your Collective record.`
              : pending
                ? 'Stripe has returned your checkout. We are waiting for final payment confirmation before activating the claim.'
                : 'We could not verify a device claim for this signed-in account. No access has been granted from this page.'}
          </p>

          {order && (
            <dl className="join-success-records">
              <div>
                <dt>Batch</dt>
                <dd>{order.device_batch_code ?? order.batch_label ?? '—'}</dd>
              </div>
              <div>
                <dt>Distribution</dt>
                <dd>{order.pack_count} packs</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd className="join-success-status">{order.status.replaceAll('_', ' ')}</dd>
              </div>
              {order.amount != null && (
                <div>
                  <dt>Total</dt>
                  <dd>{formatStripeMinorUnits(order.amount, order.currency)}</dd>
                </div>
              )}
            </dl>
          )}

          <div className="device-claim-success-actions">
            {batch && (
              <ArchiveLinkButton
                fullWidth
                href={`/devices/batches/${batch.slug}`}
                variant={confirmed ? 'primary' : 'secondary'}
              >
                {confirmed ? 'OPEN BATCH RECORD →' : 'RETURN TO BATCH'}
              </ArchiveLinkButton>
            )}
            <ArchiveLinkButton
              fullWidth
              href={order ? '/profile' : '/login?next=/devices'}
              variant="secondary"
            >
              {order ? 'VIEW MY ORDERS' : 'LOG IN TO VERIFY'}
            </ArchiveLinkButton>
          </div>
        </ArchiveCard>
      </div>
    </main>
  )
}
