import { openAiFeedJsonl } from '@/lib/shopping-feed'
import { shoppingFeedResponse } from '../shopping-feed-response'

export const dynamic = 'force-dynamic'

/** ChatGPT shopping product feed (JSON Lines) for a hosted-URL delivery. Read-only. */
export function GET() {
  return shoppingFeedResponse(openAiFeedJsonl, 'application/x-ndjson; charset=utf-8')
}
