/**
 * Briefing films are downloaded whole before they are shown, so a page never opens on an empty frame or stalls mid-loop.
 * Downloads are kept for the page's lifetime, so a replayed briefing starts at once.
 */
const urls = new Map<string, string>()
const failed = new Set<string>()
const pending = new Map<string, Promise<boolean>>()

async function download(src: string) {
  const response = await fetch(src)
  if (!response.ok) throw new Error(`${src}: ${response.status}`)
  return response.blob()
}

export function prefetchClip(src: string): Promise<boolean> {
  if (urls.has(src)) return Promise.resolve(true)
  const running = pending.get(src)
  if (running) return running
  failed.delete(src)
  const job = download(src)
    .then(blob => { urls.set(src, URL.createObjectURL(blob)); return true }, () => { failed.add(src); return false })
    .finally(() => pending.delete(src))
  pending.set(src, job)
  return job
}

export const clipReady = (src: string) => urls.has(src)
export const clipSettled = (src: string) => urls.has(src) || failed.has(src)
/** The downloaded copy when there is one; otherwise the network file streams as before. */
export const clipSource = (src: string) => urls.get(src) ?? src
