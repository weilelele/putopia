'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'

export function SectionTracker({ section }: { section: string }) {
  useEffect(() => {
    posthog.capture('section_viewed', { section })
  }, [section])
  return null
}
