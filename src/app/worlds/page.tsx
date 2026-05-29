import Link from 'next/link'
import { getAllWorlds } from '@/lib/actions/worlds'
import { SectionTracker } from '@/components/section-tracker'

export default async function WorldsPage() {
  const worlds = await getAllWorlds()

  return (
    <div className="main">
      <SectionTracker section="worlds" />
      <div className="top-bar">
        <div className="crumbs">PC://CONSOLE <span>/</span> WORLD RECORDS</div>
        <div className="right">
          <div className="item">CATALOGUED <span className="val">{worlds.length}</span></div>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="h-eyebrow">// ARCHIVE</div>
          <h1>WORLD <span className="accent">RECORDS</span></h1>
          <p className="sub">{worlds.length} discovered parallel worlds</p>
        </div>
      </div>

      {/* Stats bar */}
      <div
        className="flex gap-6 mb-8 p-4 border flex-wrap"
        style={{ background: '#111525', borderColor: '#1E2840', boxShadow: 'inset 0 1px 0 rgba(232,90,0,0.05)' }}
      >
        <div>
          <div className="text-xl font-mono font-bold" style={{ color: '#E85A00' }}>{worlds.length}</div>
          <div className="text-xs font-mono" style={{ color: '#4A5570' }}>CATALOGUED</div>
        </div>
        <div>
          <div className="text-xl font-mono font-bold" style={{ color: '#20D890' }}>8</div>
          <div className="text-xs font-mono" style={{ color: '#4A5570' }}>DISCOVERERS</div>
        </div>
        <div>
          <div className="text-xl font-mono font-bold" style={{ color: '#00C8C8' }}>200+</div>
          <div className="text-xs font-mono" style={{ color: '#4A5570' }}>NODES ON RECORD</div>
        </div>
      </div>

      {/* World Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {worlds.map((world) => {
          // Use image if available, otherwise fall back to gradient
          const hasImage = !!world.image_path
          const displayName = world.name_en || world.name

          return (
            <a
              key={world.id}
              href={`/worlds/${encodeURIComponent(world.id)}`}
              className="border overflow-hidden transition-all duration-200 group"
              style={{ background: '#111525', borderColor: '#1E2840', boxShadow: 'inset 0 1px 0 rgba(232,90,0,0.04)', textDecoration: 'none', display: 'block' }}
            >
              {/* Hero image / gradient */}
              <div className="h-52 relative overflow-hidden">
                {hasImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={world.image_path!}
                      alt={world.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* subtle dark overlay for text legibility */}
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(17,21,37,0.9) 100%)' }}
                    />
                  </>
                ) : (
                  <>
                    <div
                      className="w-full h-full"
                      style={{ background: `linear-gradient(135deg, ${world.gradient_from}, ${world.gradient_to})` }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(17,21,37,0.85) 100%)' }}
                    />
                    {/* scanline texture */}
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)' }}
                    />
                  </>
                )}
                <div className="absolute top-2 left-2">
                  <span
                    className="text-xs font-mono px-1.5 py-0.5"
                    style={{ background: 'rgba(7,9,18,0.7)', color: '#4A5570' }}
                  >
                    {world.id}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="text-sm font-mono font-semibold mb-0.5" style={{ color: '#EDE8DE' }}>
                  {displayName}
                </div>
                <p className="text-xs leading-relaxed font-mono mb-3" style={{ color: '#8A9AB5' }}>
                  {world.description}
                </p>
                <div className="pt-2 border-t flex items-center justify-between gap-2" style={{ borderColor: '#1A2238' }}>
                  <div className="min-w-0">
                    {world.discoverer_id ? (
                      <Link
                        href="/voyagers"
                        className="text-xs font-mono transition-colors hover:underline truncate block"
                        style={{ color: '#8A9AB5' }}
                      >
                        {world.discoverer_name}
                      </Link>
                    ) : world.discoverer_name ? (
                      <span className="text-xs font-mono truncate block" style={{ color: '#8A9AB5' }}>
                        {world.discoverer_name}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs font-mono shrink-0" style={{ color: '#4A5570' }}>
                    {world.discovery_date}
                  </div>
                </div>
              </div>
            </a>
          )
        })}
      </div>

      <div className="footer-bar" style={{ marginTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>WORLD ARCHIVE v2.6</div>
      </div>
    </div>
  )
}
