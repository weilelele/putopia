import { readShoppingFeedState } from '@/lib/shopping-feed-server'
import { shoppingFeedItems, type ShoppingFeedItem } from '@/lib/shopping-feed'

/** Serves a feed body from live state; 503 when seats cannot be read, so fetchers keep their last copy. */
export async function shoppingFeedResponse(render: (items: ShoppingFeedItem[]) => string, contentType: string): Promise<Response> {
  const state = await readShoppingFeedState()
  if (!state) {
    return new Response('Product feed temporarily unavailable.\n', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '3600' },
    })
  }
  return new Response(render(shoppingFeedItems(state)), {
    headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=0, s-maxage=300' },
  })
}
