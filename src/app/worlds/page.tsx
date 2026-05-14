import { worldData } from '@/lib/mock-data'

export default function WorldsPage() {
  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: '#0F0A00' }}>
      {/* Header */}
      <div className="mb-8 border-b pb-4" style={{ borderColor: '#5C4A1E' }}>
        <div className="text-xs tracking-[0.3em] font-mono mb-1" style={{ color: '#7A6A40' }}>
          ARCHIVE // WORLDS
        </div>
        <h1 className="text-2xl font-mono font-bold tracking-wider" style={{ color: '#F5E6C8' }}>
          WORLDS
        </h1>
        <div className="text-xs font-mono mt-1" style={{ color: '#7A6A40' }}>
          World Archive // {worldData.length} discovered parallel worlds
        </div>
      </div>

      {/* Stats bar */}
      <div
        className="flex gap-6 mb-8 p-4 rounded border flex-wrap"
        style={{
          background: '#221800',
          borderColor: '#5C4A1E',
          boxShadow: 'inset 0 1px 0 rgba(232,160,32,0.1)',
        }}
      >
        <div>
          <div className="text-xl font-mono font-bold" style={{ color: '#E8A020' }}>
            {worldData.length}
          </div>
          <div className="text-xs font-mono" style={{ color: '#7A6A40' }}>CATALOGUED</div>
        </div>
        <div>
          <div className="text-xl font-mono font-bold" style={{ color: '#4D8C3F' }}>
            8
          </div>
          <div className="text-xs font-mono" style={{ color: '#7A6A40' }}>DISCOVERERS</div>
        </div>
        <div>
          <div className="text-xl font-mono font-bold" style={{ color: '#C4A96A' }}>
            200+
          </div>
          <div className="text-xs font-mono" style={{ color: '#7A6A40' }}>NODES ON RECORD</div>
        </div>
      </div>

      {/* World Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {worldData.map((world) => (
          <div
            key={world.id}
            className="border rounded overflow-hidden transition-all duration-200 group"
            style={{
              background: '#221800',
              borderColor: '#5C4A1E',
              boxShadow: 'inset 0 1px 0 rgba(232,160,32,0.08)',
            }}
          >
            {/* Gradient image placeholder */}
            <div
              className="h-32 relative transition-all duration-300"
              style={{
                background: `linear-gradient(135deg, ${world.gradientFrom}, ${world.gradientTo})`,
              }}
            >
              {/* Overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to bottom, transparent 40%, rgba(34,24,0,0.8) 100%)',
                }}
              />
              {/* Scanline effect */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
                }}
              />
              {/* World ID badge */}
              <div className="absolute top-2 left-2">
                <span
                  className="text-xs font-mono px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(15,10,0,0.6)', color: '#7A6A40' }}
                >
                  {world.id}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="p-3">
              <div className="text-sm font-mono font-semibold mb-0.5" style={{ color: '#F5E6C8' }}>
                {world.name}
              </div>
              <div className="text-xs font-mono mb-2" style={{ color: world.gradientTo }}>
                {world.nameEn}
              </div>
              <p className="text-xs leading-relaxed font-mono mb-3" style={{ color: '#C4A96A' }}>
                {world.description}
              </p>
              <div className="pt-2 border-t" style={{ borderColor: '#3D3010' }}>
                <div className="text-xs font-mono" style={{ color: '#5C4A1E' }}>FIRST DISCOVERED BY</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: '#7A6A40' }}>
                  {world.discoverer}
                </div>
                <div className="text-xs font-mono" style={{ color: '#5C4A1E' }}>
                  {world.discoveryDate}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center text-xs font-mono" style={{ color: '#3D3010' }}>
        — WORLD ARCHIVE v2.6 — // CONTINUOUSLY UPDATED
      </div>
    </div>
  )
}
