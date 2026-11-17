import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { guestPilotCookie, guestPilotOffer, guestPilotOrigin, guestPilotPath, readGuestCheckout, readGuestPayment } from '@/lib/shopify-guest-pilot'

export async function POST(request: Request) {
  const origin = guestPilotOrigin(request.headers.get('host'))
  if (!origin || request.headers.get('origin') !== origin) return new Response(null, { status: 403 })
  const token = (await cookies()).get(guestPilotCookie)?.value
  const checkout = readGuestCheckout(token)
  if (!checkout) {
    const kind = (await request.formData()).get('bundle')
    const offer = guestPilotOffer(kind)
    if (!offer) return new Response(null, { status: 404 })
    return Response.redirect(new URL(`${guestPilotPath}?bundle=${offer.kind}&step=checkout`, origin), 303)
  }
  const complete = (step: string) => Response.redirect(new URL(`${guestPilotPath}?bundle=${checkout.kind}&step=${step}`, origin), 303)
  try {
    if (!await readGuestPayment(token)) return complete('pending')
    const auth = await createClient()
    const { error } = await auth.auth.signInWithOtp({
      email: checkout.email,
      options: { emailRedirectTo: new URL('/api/shopify-pilot/guest/confirm', origin).href },
    })
    if (error) throw error
    return complete('sent')
  } catch (error) {
    console.error('Shopify guest email verification start failed', error instanceof Error ? error.message : error)
    return complete('retry')
  }
}
