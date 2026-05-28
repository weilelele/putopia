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

  // Smart routing for root /
  // Ad links (with UTM params) are transparently forwarded to /new so the
  // existing campaign URLs never need to change.
  if (pathname === '/') {
    if (user) {
      return NextResponse.redirect(new URL('/console', request.url))
    }
    const qs = request.nextUrl.searchParams.toString()
    if (qs) {
      // Preserve all query params (UTM, preview, etc.)
      return NextResponse.redirect(new URL('/new?' + qs, request.url))
    }
    return NextResponse.redirect(new URL('/console', request.url))
  }

  // Category listing pages require a logged-in user
  // Guests can access individual content pages (e.g. /intel/[id]) but not the root listings
  const GUEST_BLOCKED = ['/intel', '/devices', '/worlds', '/voyagers', '/vote', '/logs']
  if (!user && GUEST_BLOCKED.some(p => pathname === p || pathname === p + '/')) {
    return NextResponse.redirect(new URL('/console', request.url))
  }

  // /profile requires a logged-in user
  if (pathname.startsWith('/profile') && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // /admin and /studio both require architect role
  if (pathname.startsWith('/admin') || pathname.startsWith('/studio')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const { data: profile } = await supabase
      .from('voyager_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'architect') {
      return NextResponse.redirect(new URL('/console', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
