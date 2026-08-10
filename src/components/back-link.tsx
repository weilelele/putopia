'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/**
 * Borderless back link for second-level pages. Sits in the slot the page
 * eyebrow ("// X") used to occupy, above the page title, and returns to the
 * parent (one level up).
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        minHeight: 44,
        padding: '0.35rem 0.25rem',
        color: 'rgba(227,82,5,0.8)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--fs-caption)',
        letterSpacing: '0.14em',
        textDecoration: 'none',
        margin: '-0.35rem -0.25rem 0.15rem',
        width: 'fit-content',
      }}
    >
      <ArrowLeft size={13} />
      {label}
    </Link>
  )
}
