import { parallaxArrayName } from '@/lib/parallax-brand'

/** One publication notification, addressed only to the original observer. */
export function buildDreamcatcherEmail(input: { worldName: string; worldId: string; arrayName?: string; roundNumber: number; closesAt: string; siteUrl: string }) {
  const name = input.worldName.replace(/[\r\n]/g, ' ').slice(0, 120)
  const array = parallaxArrayName(input.arrayName ?? 'Parallax Array')
  const url = `${input.siteUrl.replace(/\/$/, '')}/worlds/${encodeURIComponent(input.worldId)}`
  const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const closes = new Date(input.closesAt).toISOString().replace('T', ' ').replace('.000Z', ' UTC')
  const subject = `A new signal from your world — Round ${input.roundNumber}`
  const introduction = `The ${array} has received a new set of images linked to “${name}”.`
  const guidance = 'Look through the images and choose the one that feels closest to what you experienced. Your response will guide the next observation.'
  const text = `Your observation has returned a signal.\n\n${introduction}\n\n${guidance}\n\nCommunity feedback is open until ${closes}.\n\nView the signals: ${url}\n\nMultiverse Collective`
  const html = `<div style="font-family:'Courier New',monospace;max-width:520px;margin:auto;line-height:1.6"><p>PARALLAX ARRAY · ROUND ${input.roundNumber}</p><h1>Your observation has returned a signal.</h1><p>${escape(introduction)}</p><p>${guidance}</p><p>Community feedback is open until ${escape(closes)}.</p><p><a href="${escape(url)}">VIEW THE SIGNALS</a></p><p>Multiverse Collective</p></div>`
  return { subject, text, html }
}
