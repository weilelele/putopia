'use server'

import { revalidatePath } from 'next/cache'
import { getRequestUser } from '@/lib/request-auth'
import { pilotBuyerEmail, shopifyBundlePilotConfig } from '@/lib/shopify-bundle-pilot'
import { readShopifyPilotPayment, syncShopifyPilotPayment } from '@/lib/shopify-pilot-payment'

export async function checkShopifyBundlePilotPayment() {
  const { data: { user } } = await getRequestUser()
  const email = pilotBuyerEmail(user)
  const config = shopifyBundlePilotConfig(user?.id)
  if (!config || !user || !email) {
    return { error: 'Sign in with the test account for this bundle.' }
  }

  try {
    const snapshot = await readShopifyPilotPayment(config, { reference: config.reference, createdAt: user.created_at, email })
    if (!snapshot) return { pending: true }
    await syncShopifyPilotPayment(config, user, snapshot)
    revalidatePath('/voyager-initiation')
    return { synced: true }
  } catch (error) {
    console.error('Shopify bundle pilot synchronization failed', error instanceof Error ? error.message : error)
    return { error: 'We could not verify this test payment. Please try again.' }
  }
}
