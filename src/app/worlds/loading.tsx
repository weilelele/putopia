// Instant skeleton shown the moment the WORLDS nav tab is tapped, before the
// server's first streamed chunk arrives. The page itself (page.tsx) then streams
// each section in top-down via <Suspense>, so this is only the brief first paint.

const Bar = ({ w, h = 14 }: { w: number | string; h?: number }) => (
  <div
    className="wr-skeleton"
    style={{ width: w, height: h, borderRadius: 4, background: 'rgba(227,82,5,0.10)' }}
  />
)

export default function Loading() {
  return (
    <div className="main" aria-busy="true">
      <style>{`@keyframes wrPulse{0%,100%{opacity:.45}50%{opacity:.85}}.wr-skeleton{animation:wrPulse 1.2s ease-in-out infinite}`}</style>

      <div className="top-bar">
        <div className="crumbs">PC://CONSOLE <span>/</span> WORLD RECORDS</div>
      </div>

      <div className="page-head">
        <h1>WORLD <span className="accent">RECORDS</span></h1>
      </div>

      <div
        style={{
          display: 'flex', gap: '0.75rem', marginBottom: '2rem', padding: '0.875rem 1rem',
          justifyContent: 'space-between', background: 'var(--bg-card)',
          border: '1px solid rgba(227,82,5,0.12)',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <Bar w={28} h={18} />
            <Bar w={64} h={10} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="wr-skeleton"
            style={{ aspectRatio: '3 / 4', borderRadius: 8, background: 'rgba(227,82,5,0.08)' }}
          />
        ))}
      </div>
    </div>
  )
}
