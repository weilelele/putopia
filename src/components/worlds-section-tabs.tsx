import Link from 'next/link'

export type WorldsSection = 'observe' | 'explore'

const SECTIONS: { id: WorldsSection; label: string; href: string }[] = [
  { id: 'explore', label: 'EXPLORE', href: '/worlds' },
  { id: 'observe', label: 'OBSERVE', href: '/worlds?section=observe' },
]

/** Explore is the default Worlds entry; Observe retains the established-world archive. */
export function WorldsSectionTabs({ active }: { active: WorldsSection }) {
  return (
    <nav className="archive-tabs" aria-label="Worlds sections">
      {SECTIONS.map(({ id, label, href }) => (
        <Link
          key={id}
          href={href}
          prefetch={false}
          aria-current={id === active ? 'page' : undefined}
          className={`archive-tabs__tab${id === active ? ' is-active' : ''}`}
          style={{ textDecoration: 'none', flex: 1 }}
        >
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}
