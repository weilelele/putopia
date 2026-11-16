import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveInput } from '@/components/archive-input'
import { getRequestUser } from '@/lib/request-auth'
import { pilotBuyerEmail } from '@/lib/shopify-bundle-pilot'
import { guestPilotCookie, guestPilotOffer, guestPilotPath, readGuestCheckout } from '@/lib/shopify-guest-pilot'
import { createClient } from '@/lib/supabase/server'

const messages: Record<string, string> = {
  checkout: 'Start your Shopify checkout before requesting email verification.',
  sent: 'Check your inbox. Open the verification link in this browser to activate your membership.',
  pending: 'Payment has not been confirmed yet. Finish Shopify checkout and try again.',
  expired: 'This verification link is unavailable. Request a fresh link in this browser.',
  retry: 'We could not confirm this checkout. Try again.',
}

export default async function GuestCheckoutPage({ searchParams }: { searchParams: Promise<{ bundle?: string; step?: string }> }) {
  const { bundle, step } = await searchParams
  const kind = bundle === 'standard' ? 'standard' : 'initial'
  const offer = guestPilotOffer(kind)
  if (!offer) notFound()
  const { data: { user } } = await getRequestUser()
  const checkout = readGuestCheckout((await cookies()).get(guestPilotCookie)?.value)

  async function startSignedOut() {
    'use server'
    if (!guestPilotOffer(kind)) notFound()
    const client = await createClient()
    const { data: { user: activeUser } } = await client.auth.getUser()
    if (activeUser && pilotBuyerEmail(activeUser)) {
      const { error } = await client.auth.signOut({ scope: 'local' })
      if (error) throw error
    }
    redirect(`${guestPilotPath}?bundle=${kind}`)
  }

  return <main className="main pilot-archive-page pilot-login-page">
    <div className="pilot-login-shell">
      <header className="pilot-login-heading">
        <h1 className="pilot-login-title">GUEST CHECKOUT</h1>
        <p>{kind === 'initial' ? 'Initial Voyager Pack' : 'Complete Voyager Pack'} · ${offer.amount} USD</p>
      </header>
      {step && Object.hasOwn(messages, step) && <p role="status">{messages[step]}</p>}
      {user ? checkout && pilotBuyerEmail(user) === checkout.email ? (
        <Link href="/api/shopify-pilot/guest/confirm" prefetch={false}>Finish verified checkout</Link>
      ) : (
        <form className="pilot-login-form" action={startSignedOut}>
          {pilotBuyerEmail(user) && <ArchiveButton type="submit" fullWidth>START SIGNED-OUT TEST</ArchiveButton>}
          <Link href="/voyager-initiation">View your membership</Link>
        </form>
      ) : <>
        <form className="pilot-login-form" action="/api/shopify-pilot/guest" method="post" target="_blank" rel="noopener">
          <input type="hidden" name="bundle" value={kind} />
          <ArchiveField htmlFor="guest-email" label="EMAIL ADDRESS">
            <ArchiveInput id="guest-email" name="email" type="email" autoComplete="email" defaultValue={checkout?.email} required />
          </ArchiveField>
          <ArchiveButton type="submit" fullWidth>CONTINUE TO SHOPIFY</ArchiveButton>
        </form>
        <form className="pilot-login-form" action="/api/shopify-pilot/guest/verify" method="post">
          <input type="hidden" name="bundle" value={kind} />
          <ArchiveButton type="submit" variant="secondary" fullWidth>AFTER PAYMENT, VERIFY EMAIL</ArchiveButton>
        </form>
      </>}
    </div>
  </main>
}
