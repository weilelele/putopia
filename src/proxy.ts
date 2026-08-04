import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Skip auth middleware if Supabase is not configured yet
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — do not remove this call
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // At most ONE voyager_profiles roundtrip per request, shared by every gate
  // below (registration, /admin, /studio).
  let profilePromise: Promise<{
    registered_at: string | null
    role: string | null
    can_edit_onboarding: boolean | null
  } | null> | null = null
  const getProfile = () => {
    profilePromise ??= Promise.resolve(
      supabase
        .from('voyager_profiles')
        .select('registered_at, role, can_edit_onboarding')
        .eq('id', user!.id)
        .maybeSingle()
        .then(({ data }) => data)
    )
    return profilePromise
  }

  // Registration gate.
  // The handle_new_user trigger auto-creates a shell voyager_profile on every
  // auth signup, so a user who clicks an invite link gets a live session BEFORE
  // ever completing /register — they have no password and no chosen identity
  // (registered_at stays NULL). Force any such logged-in user through /register
  // before they can browse or post anything.
  //
  // Registration is one-way, so once confirmed we cache it in a cookie and the
  // hot path skips the DB entirely. This is a funnel gate, not a security
  // boundary — a forged cookie only lets an unregistered user browse with a
  // shell profile; every privileged check still queries the DB.
  const REG_COOKIE = 'pv-registered'
  if (user) {
    const REGISTER_EXEMPT = ['/register', '/auth', '/api']
    const exempt = REGISTER_EXEMPT.some((p) => pathname === p || pathname.startsWith(p + '/'))
    if (!exempt && request.cookies.get(REG_COOKIE)?.value !== user.id) {
      const profile = await getProfile()
      if (!profile?.registered_at) {
        return NextResponse.redirect(new URL('/register', request.url))
      }
      supabaseResponse.cookies.set(REG_COOKIE, user.id, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      })
    }
  }

  // Smart routing for root /
  // Ad links (with UTM params) are transparently forwarded to /new so the
  // existing campaign URLs never need to change.
  if (pathname === '/') {
    if (user) {
      return NextResponse.redirect(new URL('/console', request.url))
    }
    const qs = request.nextUrl.searchParams.toString()
    if (qs) {
      // Auth error params should not trigger the onboarding flow
      if (request.nextUrl.searchParams.has('error')) {
        return NextResponse.redirect(new URL('/auth/expired', request.url))
      }
      // Preserve UTM/preview params for onboarding
      return NextResponse.redirect(new URL('/new?' + qs, request.url))
    }
    return NextResponse.redirect(new URL('/console', request.url))
  }

  // Category listing pages require a logged-in user.
  // Guests can access individual content pages (e.g. /intel/[id]) but not the root listings.
  // Redirect to /login with a ?redirect= param so the user lands on the right page after signing in.
  const GUEST_BLOCKED = ['/intel', '/devices', '/worlds', '/voyagers', '/vote', '/logs']
  if (!user && GUEST_BLOCKED.some(p => pathname === p || pathname === p + '/')) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // /profile requires a logged-in user
  if (pathname.startsWith('/profile') && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // /voyager-pack is a public product page — accessible to all users including guests.
  // Auth + purchase gating is handled inside /api/checkout.

  // Device claims require a signed-in account. Applicant eligibility and
  // payment authorization are enforced again by /api/device-checkout.
  if (pathname.startsWith('/devices/claim')) {
    if (!user) {
      const loginUrl = request.nextUrl.clone()
      const returnTo = `${pathname}${request.nextUrl.search}`
      loginUrl.pathname = '/login'
      loginUrl.search = ''
      loginUrl.searchParams.set('redirect', returnTo)
      return NextResponse.redirect(loginUrl)
    }
  }

  // /admin and /studio both require architect role.
  // Exception: /admin/onboarding-preview is also open to users explicitly
  // granted can_edit_onboarding (page-level grant for non-architects).
  if (pathname.startsWith('/admin') || pathname.startsWith('/studio')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const profile = await getProfile()

    const isArchitect = profile?.role === 'architect'
    const onboardingGrant =
      pathname.startsWith('/admin/onboarding-preview') && profile?.can_edit_onboarding === true

    if (!isArchitect && !onboardingGrant) {
      return NextResponse.redirect(new URL('/console', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Skip static assets and endpoints that carry their own auth
    // (Stripe webhook verifies signatures, cron routes check CRON_SECRET) —
    // every match below pays a Supabase auth roundtrip.
    '/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|mp4|webm|mp3|woff2?|ttf|txt|xml|map)$).*)',
  ],
}
