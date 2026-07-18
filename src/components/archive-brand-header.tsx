import Image from 'next/image'
import Link from 'next/link'

interface ArchiveBrandHeaderProps {
  className?: string
  href?: string
}

export function ArchiveBrandHeader({ className = '', href = '/console' }: ArchiveBrandHeaderProps) {
  return (
    <header className={`archive-brand-header${className ? ` ${className}` : ''}`}>
      <Link href={href} className="archive-brand-lockup" aria-label="Multiverse Collective home">
        <Image className="archive-brand-icon" src="/assets/vi-icon.png" width={881} height={492} alt="" />
        <Image
          className="archive-brand-wordmark"
          src="/assets/vi-wordmark.png"
          width={3699}
          height={1020}
          alt="Multiverse Collective"
          preload
        />
      </Link>
    </header>
  )
}
