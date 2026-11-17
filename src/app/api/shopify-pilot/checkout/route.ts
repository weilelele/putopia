import { getRequestUser } from '@/lib/request-auth'
import { readInitiationSnapshot } from '@/lib/initiation-server'
import { createShopifyPilotCheckout, pilotBuyerEmail, shopifyBundlePilotConfig } from '@/lib/shopify-bundle-pilot'

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 })
  const origin = URL.parse(request.headers.get('origin') ?? '')
  if (!origin || origin.host !== request.headers.get('host')) return new Response(null, { status: 403 })

  const auth = getRequestUser()
  const { data: { user } } = await auth
  const config = shopifyBundlePilotConfig(user?.id)
  const email = pilotBuyerEmail(user)
  if (!config || !email) return new Response(null, { status: 403 })
  const snapshot = await readInitiationSnapshot(auth)
  if (snapshot.role !== 'applicant' || snapshot.paymentStatus !== 'none' || snapshot.status === 'unknown') {
    return new Response('This test membership already has a checkout or is unavailable.', { status: 409 })
  }
  if (config.draftUrl) return Response.redirect(config.draftUrl, 303)

  try {
    return Response.redirect(await createShopifyPilotCheckout(config, email, config.reference), 303)
  } catch (error) {
    console.error('Shopify pilot cart creation failed', error instanceof Error ? error.message : error)
    return new Response('Shopify test checkout is temporarily unavailable. Return to Putopia to retry.', { status: 502 })
  }
}
