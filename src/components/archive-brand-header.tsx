import Image from 'next/image'
import Link from 'next/link'
interface ArchiveBrandHeaderProps { className?: string; href?: string; variant?: 'primary' | 'brand' }
export function ArchiveBrandHeader({ className = '', href, variant = 'primary' }: ArchiveBrandHeaderProps) {
  const images = <><Image className="archive-brand-icon" src="/assets/vi-icon.png" width={881} height={492} sizes="40px" alt="" /><Image className="archive-brand-wordmark" src="/assets/vi-wordmark.png" width={3699} height={1020} sizes="160px" alt="Multiverse Collective" /></>
  return <div className={`archive-brand-header archive-brand-header--${variant} ${className}`}>
    {href ? <Link href={href} className="archive-brand-lockup" aria-label="Multiverse Collective">{images}</Link> : <div className="archive-brand-lockup">{images}</div>}
  </div>
}
