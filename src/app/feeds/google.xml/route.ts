import { googleMerchantFeedXml } from '@/lib/shopping-feed'
import { shoppingFeedResponse } from '../shopping-feed-response'

export const dynamic = 'force-dynamic'

/** Google Merchant Center scheduled-fetch feed. Read-only. */
export function GET() {
  return shoppingFeedResponse(googleMerchantFeedXml, 'application/xml; charset=utf-8')
}
