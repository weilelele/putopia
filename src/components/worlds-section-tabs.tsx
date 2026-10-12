import Link from 'next/link'

export type WorldsSection = 'observe' | 'explore'

const SECTIONS: { id: WorldsSection; label: string; href: string }[] = [
  { id: 'observe', label: 'OBSERVE', href: '/worlds' },
  { id: 'explore', label: 'EXPLORE', href: '/worlds/live' },
]

/** Shared switcher for the two Worlds surfaces: Observe (browse established worlds, default entry) and Explore (Dreamcatcher: initial visions + dispatch tasks). */
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
