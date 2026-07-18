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

  // Verify the access token and refresh it when needed. With asymmetric signing
  // keys this uses the cached JWKS locally, avoiding a Supabase Auth round-trip
  // on every client navigation while preserving a trusted user identity.
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims.sub

  const { pathname } = request.nextUrl

  // Registration gate.
  // The handle_new_user trigger auto-creates a shell voyager_profile on every
  // auth signup, so a user who clicks an invite link gets a live session BEFORE
  // ever completing /register — they have no password and no chosen identity
  // (registered_at stays NULL). Force any such logged-in user through /register
  // before they can browse or post anything.
  if (userId) {
    const REGISTER_EXEMPT = ['/register', '/auth', '/api']
    const exempt = REGISTER_EXEMPT.some((p) => pathname === p || pathname.startsWith(p + '/'))
    if (!exempt) {
      const { data: regProfile } = await supabase
        .from('voyager_profiles')
        .select('registered_at')
        .eq('id', userId)
        .maybeSingle()
      if (!regProfile?.registered_at) {
        return NextResponse.redirect(new URL('/register', request.url))
      }
    }
  }

  // Smart routing for root /
  // Ad links (with UTM params) are transparently forwarded to /new so the
  // existing campaign URLs never need to change.
  if (pathname === '/') {
    if (userId) {
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
  if (!userId && GUEST_BLOCKED.some(p => pathname === p || pathname === p + '/')) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // /profile requires a logged-in user
  if (pathname.startsWith('/profile') && !userId) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // /voyager-pack is a public product page — accessible to all users including guests.
  // Auth + purchase gating is handled inside /api/checkout.

  // /admin and /studio both require architect role.
  // Exception: /admin/onboarding-preview is also open to users explicitly
  // granted can_edit_onboarding (page-level grant for non-architects).
  if (pathname.startsWith('/admin') || pathname.startsWith('/studio')) {
    if (!userId) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const { data: profile } = await supabase
      .from('voyager_profiles')
      .select('role, can_edit_onboarding')
      .eq('id', userId)
      .single()

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
    '/((?!_next/static|_next/image|favicon.ico|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
