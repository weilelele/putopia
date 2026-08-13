export type RedditPixelEvent = 'Lead' | 'SignUp'

type RedditPixelFunction = (
  method: 'track',
  event: RedditPixelEvent,
  metadata: { conversionId: string },
) => void

export function trackRedditPixelEvent(
  event: RedditPixelEvent,
  conversionId: string,
): boolean {
  if (typeof window === 'undefined') return false

  const rdt = (window as typeof window & { rdt?: RedditPixelFunction }).rdt
  if (!rdt) return false

  rdt('track', event, { conversionId })
  return true
}
