import { getMyProfile } from '@/lib/actions/profile'
import { getMyOrders } from '@/lib/actions/orders'
import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchivePageHeader } from '@/components/archive-page-header'

export const dynamic = 'force-dynamic'

export default async function JoinSuccessPage() {
  const [profile, orders] = await Promise.all([getMyProfile(), getMyOrders()])
  const order = orders[0] ?? null   // latest order for the success card

  // Anonymous Stripe purchaser (no session on this domain yet): the invite email
  // is their way in.
  if (!profile) {
    return (
      <main className="main join-success-page">
        <div className="join-success-shell">
          <ArchiveBrandHeader />
          <ArchiveCard className="join-success-card">
            <ArchivePageHeader title="WELCOME," accent="VOYAGER." />
            <p className="join-success-copy">
            Your payment is confirmed and your Initial Voyager Pack is being prepared.
            Check your email to set your password and enter the Collective.
            </p>
          </ArchiveCard>
        </div>
      </main>
    )
  }

  // member_no / batch_label are newer than the generated Database types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = profile as any

  return (
    <main className="main join-success-page">
      <div className="join-success-shell">
        <ArchiveBrandHeader />
        <ArchiveCard className="join-success-card">
          <ArchivePageHeader title="WELCOME," accent={`${p.display_name}.`} />
          <p className="join-success-copy">
          You are now a Voyager. Your Initial Voyager Pack is being prepared and
          will be mailed to you.
          </p>

          <dl className="join-success-records">
          {p.member_no != null && (
            <div>
              <dt>Voyager No.</dt>
              <dd>
                #{String(p.member_no).padStart(3, '0')}
              </dd>
            </div>
          )}
          <div>
            <dt>Batch</dt>
            <dd>{p.batch_label}</dd>
          </div>
          {order && (
            <div>
              <dt>Pack</dt>
              <dd className="join-success-status">
                {order.status}
              </dd>
            </div>
          )}
          </dl>

          <ArchiveLinkButton href="/profile" fullWidth variant="primary">
            UPDATE VOYAGER PROFILE →
          </ArchiveLinkButton>
        </ArchiveCard>
      </div>
    </main>
  )
}
