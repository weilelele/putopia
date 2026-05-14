import { worldData } from '@/lib/mock-data'

export default function WorldsPage() {
  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: '#070912' }}>
      {/* Header */}
      <div className="mb-8 border-b pb-4" style={{ borderColor: '#1E2840' }}>
        <div className="text-xs tracking-[0.3em] font-mono mb-1" style={{ color: '#4A5570' }}>
          ARCHIVE // WORLDS
        </div>
        <h1 className="text-2xl font-mono font-bold tracking-wider" style={{ color: '#EDE8DE' }}>
          WORLDS
        </h1>
        <div className="text-xs font-mono mt-1" style={{ color: '#4A5570' }}>
          World Archive // {worldData.length} discovered parallel worlds
        </div>
      </div>

      {/* Stats bar */}
      <div
        className="flex gap-6 mb-8 p-4 border flex-wrap"
        style={{
          background: '#111525',
          borderColor: '#1E2840',
          boxShadow: 'inset 0 1px 0 rgba(232,90,0,0.05)',
        }}
      >
        <div>
          <div className="text-xl font-mono font-bold" style={{ color: '#E85A00' }}>
            {worldData.length}
          </div>
          <div className="text-xs font-mono" style={{ color: '#4A5570' }}>CATALOGUED</div>
        </div>
        <div>
          <div className="text-xl font-mono font-bold" style={{ color: '#20D890' }}>
            8
          </div>
          <div className="text-xs font-mono" style={{ color: '#4A5570' }}>DISCOVERERS</div>
        </div>
        <div>
          <div className="text-xl font-mono font-bold" style={{ color: '#00C8C8' }}>
            200+
          </div>
          <div className="text-xs font-mono" style={{ color: '#4A5570' }}>NODES ON RECORD</div>
        </div>
      </div>

      {/* World Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {worldData.map((world) => (
          <div
            key={world.id}
            className="border overflow-hidden transition-all duration-200 group"
            style={{
              background: '#111525',
              borderColor: '#1E2840',
              boxShadow: 'inset 0 1px 0 rgba(232,90,0,0.04)',
            }}
          >
            {/* Gradient image placeholder */}
            <div
              className="h-32 relative transition-all duration-300"
              style={{
                background: `linear-gradient(135deg, ${world.gradientFrom}, ${world.gradientTo})`,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to bottom, transparent 40%, rgba(17,21,37,0.85) 100%)',
                }}
              />
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
                }}
              />
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
                {world.name}
              </div>
              <div className="text-xs font-mono mb-2" style={{ color: world.gradientTo }}>
                {world.nameEn}
              </div>
              <p className="text-xs leading-relaxed font-mono mb-3" style={{ color: '#8A9AB5' }}>
                {world.description}
              </p>
              <div className="pt-2 border-t" style={{ borderColor: '#1A2238' }}>
                <div className="text-xs font-mono" style={{ color: '#4A5570' }}>FIRST DISCOVERED BY</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: '#8A9AB5' }}>
                  {world.discoverer}
                </div>
                <div className="text-xs font-mono" style={{ color: '#4A5570' }}>
                  {world.discoveryDate}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center text-xs font-mono" style={{ color: '#1A2238' }}>
        — WORLD ARCHIVE v2.6 — // CONTINUOUSLY UPDATED
      </div>
    </div>
  )
}
