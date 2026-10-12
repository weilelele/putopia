/**
 * Observe list order, shared by the list and by swipe navigation on the detail
 * page so both walk the worlds in the same sequence: the lead world (the first
 * with a photo), then the other photo worlds, then fuzzy signals still waiting
 * for a first observer. The input is expected newest first.
 */
export function orderFeed<T>(items: T[], hasPhoto: (item: T) => boolean): T[] {
  const lead = items.find(hasPhoto)
  const rest = items.filter((item) => item !== lead)
  return [...(lead ? [lead] : []), ...rest.filter(hasPhoto), ...rest.filter((item) => !hasPhoto(item))]
}
