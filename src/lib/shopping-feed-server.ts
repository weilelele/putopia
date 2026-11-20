import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'
import { initiationConfigurationError } from '@/lib/initiation-config'
import { parseInitiationAvailability } from '@/lib/initiation-membership'
import type { ShoppingFeedState } from './shopping-feed'

/**
 * Reads live S26 seats and checkout configuration, the same sources the
 * initiation page uses. Returns null when seats cannot be read, so the feed
 * routes fail rather than publish a guessed stock level.
 */
export async function readShoppingFeedState(now = new Date()): Promise<ShoppingFeedState | null> {
  try {
    // initiation_availability is a service-role RPC, as on the initiation page.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any
    const { data, error } = await admin.rpc('initiation_availability')
    const supply = parseInitiationAvailability(data)
    if (error || !supply) return null
    return {
      remainingSeats: supply.remaining,
      checkoutOpen: {
        initial: supply.open && !initiationConfigurationError('initial'),
        standard: supply.open && !initiationConfigurationError('standard'),
      },
      now,
    }
  } catch {
    return null
  }
}
