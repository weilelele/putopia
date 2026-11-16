import { cookies } from 'next/headers'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { pilotBuyerEmail } from '@/lib/shopify-bundle-pilot'
import { guestPilotCookie, guestPilotOrigin, guestPilotPath, readGuestCheckout, readGuestPayment } from '@/lib/shopify-guest-pilot'
import { syncShopifyPilotPayment } from '@/lib/shopify-pilot-payment'

export async function GET(request: Request) {
  const origin = guestPilotOrigin(request.headers.get('host'))
  if (!origin) return new Response(null, { status: 403 })
  const jar = await cookies()
  const token = jar.get(guestPilotCookie)?.value
  const checkout = readGuestCheckout(token)
  if (!checkout) return new Response(null, { status: 404 })
  const retry = (step: string) => Response.redirect(new URL(`${guestPilotPath}?bundle=${checkout.kind}&step=${step}`, origin), 303)

  try {
    const auth = await createClient()
    const code = new URL(request.url).searchParams.get('code')
    if (code) {
      const { error } = await auth.auth.exchangeCodeForSession(code)
      if (error) return retry('expired')
    }
    const { data: { user } } = await auth.auth.getUser()
    if (!user || pilotBuyerEmail(user) !== checkout.email) return retry('expired')
    const paid = await readGuestPayment(token)
    if (!paid) return retry('pending')

    const admin = createAdminClient()
    // The isolated fixture database may lack the standard Auth profile trigger.
    const { error: profileError } = await admin.from('voyager_profiles').upsert({
      id: user.id, role: 'applicant', account_kind: 'human', email: checkout.email, display_name: 'Voyager',
    } as never, { onConflict: 'id', ignoreDuplicates: true })
    if (profileError) throw profileError
    await syncShopifyPilotPayment(paid.offer, user, paid.payment)
    const { error: registrationError } = await admin.from('voyager_profiles')
      .update({ registered_at: new Date().toISOString() } as never).eq('id', user.id).is('registered_at', null)
    if (registrationError) throw registrationError
    jar.delete(guestPilotCookie)
    return Response.redirect(new URL('/voyager-initiation', origin), 303)
  } catch (error) {
    console.error('Shopify guest order claim failed', error instanceof Error ? error.message : error)
    return retry('retry')
  }
}
