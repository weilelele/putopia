import { InvestorDeckView } from '../investor-deck/page'

export const dynamic = 'force-dynamic'

export default function PublicInfoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return <InvestorDeckView searchParams={searchParams} returnTo="/public-info" />
}
