'use client'

import { useEffect } from 'react'

// This page is never rendered in practice —
// proxy.ts intercepts all visits to / and redirects before the page loads:
//   - logged-in user       → /console
//   - any query params     → /new?<params> (preserves UTM + preview flags)
//   - no params, guest     → /console (broadcast view)
// This component is a safety fallback only.
export default function RootPage() {
  useEffect(() => {
    const params = window.location.search
    if (params) {
      window.location.replace('/new' + params)
    } else {
      window.location.replace('/console')
    }
  }, [])

  return null
}
