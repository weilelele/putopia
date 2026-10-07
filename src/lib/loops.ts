/**
 * Minimal Loops contact helper (loops.so).
 *
 * The /contacts/create endpoint acts as an upsert — it updates the contact
 * when the email already exists, so we don't need a separate update call.
 *
 * Configure via env:
 *   LOOPS_API_KEY  — required; without it calls are silently skipped
 */

const LOOPS_API = 'https://app.loops.so/api/v1'

type LoopsContact = {
  email: string
  firstName?: string
  userId?: string
  userGroup?: string
  // UTM / acquisition
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  // custom boolean properties
  registered?: boolean
}

export async function upsertLoopsContact(input: LoopsContact): Promise<void> {
  const key = process.env.LOOPS_API_KEY
  if (!key) {
    console.warn('[loops] LOOPS_API_KEY not set — skipping', input.email)
    return
  }
  try {
    const res = await fetch(`${LOOPS_API}/contacts/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[loops] upsert failed', res.status, detail)
    }
  } catch (e) {
    console.error('[loops] upsertLoopsContact threw', e)
  }
}

/** Removes a contact from the Loops list (used when a member deletes their account). */
export async function deleteLoopsContact(email: string): Promise<void> {
  const key = process.env.LOOPS_API_KEY
  if (!key) {
    console.warn('[loops] LOOPS_API_KEY not set — skipping delete', email)
    return
  }
  try {
    const res = await fetch(`${LOOPS_API}/contacts/delete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!res.ok && res.status !== 404) console.error('[loops] delete failed', res.status, await res.text().catch(() => ''))
  } catch (e) {
    console.error('[loops] deleteLoopsContact threw', e)
  }
}
