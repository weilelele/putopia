import { getMyProfile } from '@/lib/actions/profile'
import { getMyOrders } from '@/lib/actions/orders'
import { isPaidVoyagerPack } from '@/lib/voyager-intake'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchivePageHeader } from '@/components/archive-page-header'

export const dynamic = 'force-dynamic'

export default async function JoinSuccessPage() {
  const [profile, orders] = await Promise.all([getMyProfile(), getMyOrders()])
  const packPaid = orders.some(isPaidVoyagerPack)
  const isVoyager = profile?.role === 'voyager' || profile?.role === 'architect'
  return (
    <main className="main join-success-page">
      <div className="join-success-shell">
        <ArchiveCard className="join-success-card">
          <ArchivePageHeader title={packPaid ? 'PACK' : 'THANK YOU'} accent={packPaid ? 'CLAIMED' : 'FOR YOUR ORDER'} />
          <p className="join-success-copy">
            {!profile ? 'Log in or check your invitation email to view your payment status and continue your path to Voyager.'
              : !packPaid ? 'Your payment confirmation may still be arriving. Your path will update when it is confirmed.'
                : isVoyager ? 'Your Initial Voyager Pack is being prepared. Welcome to the Collective.'
                  : 'Your Initial Voyager Pack is being prepared. Establish your Voyager profile to complete your path.'}
          </p>
          <ArchiveLinkButton href={!profile ? '/login?redirect=/voyager-path' : '/voyager-path'} fullWidth variant="primary">
            {!profile ? 'LOG IN' : 'VIEW YOUR PATH'} →
          </ArchiveLinkButton>
        </ArchiveCard>
      </div>
    </main>
  )
}
