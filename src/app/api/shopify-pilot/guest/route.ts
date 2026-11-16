import { cookies } from 'next/headers'
import { getRequestUser } from '@/lib/request-auth'
import { createShopifyPilotCheckout } from '@/lib/shopify-bundle-pilot'
import { guestCheckoutCookieValue, guestPilotCookie, guestPilotEmail, guestPilotLifetime, guestPilotOffer, guestPilotOrigin, newGuestCheckout, readGuestCheckout } from '@/lib/shopify-guest-pilot'

export async function POST(request: Request) {
  const origin = guestPilotOrigin(request.headers.get('host'))
  if (!origin || request.headers.get('origin') !== origin) return new Response(null, { status: 403 })
  const form = await request.formData()
  const offer = guestPilotOffer(form.get('bundle'))
  if (!offer) return new Response(null, { status: 404 })
  const email = guestPilotEmail(form.get('email'))
  if (!email) return new Response('Use the email assigned for this local test.', { status: 400 })
  const { data: { user } } = await getRequestUser()
  if (user) return new Response('Sign out of Putopia before starting a guest test.', { status: 409 })

  const jar = await cookies()
  const existing = readGuestCheckout(jar.get(guestPilotCookie)?.value)
  if (existing) {
    if (existing.email !== email || existing.kind !== offer.kind) {
      return new Response('Finish the test checkout already open in this browser first.', { status: 409 })
    }
    return Response.redirect(existing.checkoutUrl, 303)
  }
  try {
    const checkout = newGuestCheckout(offer, email)
    const checkoutUrl = await createShopifyPilotCheckout(offer, email, checkout.reference)
    jar.set(guestPilotCookie, guestCheckoutCookieValue({ ...checkout, checkoutUrl }), {
      httpOnly: true, sameSite: 'lax', path: '/', maxAge: guestPilotLifetime,
    })
    return Response.redirect(checkoutUrl, 303)
  } catch (error) {
    console.error('Shopify guest checkout creation failed', error instanceof Error ? error.message : error)
    return new Response('Shopify guest checkout is temporarily unavailable. Return to Putopia to retry.', { status: 502 })
  }
}
