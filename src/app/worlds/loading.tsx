import { ArchiveBrandHeader } from '@/components/archive-brand-header'

const Bar = ({ w, h = 14 }: { w: number | string; h?: number }) => (
  <div
    className="wr-skeleton"
    style={{ width: w, height: h, borderRadius: 4, background: 'rgba(227,82,5,0.10)' }}
  />
)

export default function Loading() {
  return (
    <main className="main pilot-archive-page archive-collection-page" aria-busy="true">
      <ArchiveBrandHeader />
      <style>{`@keyframes wrPulse{0%,100%{opacity:.45}50%{opacity:.85}}.wr-skeleton{animation:wrPulse 1.2s ease-in-out infinite}`}</style>

      <header className="archive-page-header worlds-page-header">
        <h1 className="archive-page-header__title"><span>WORLDS</span></h1>
        <div className="archive-page-header__action">
          <div className="worlds-report-loading wr-skeleton" />
        </div>
      </header>

      <div className="worlds-view-tabs" aria-hidden="true">
        <span className="worlds-view-tabs__link is-active">Signal Dispatch</span>
        <span className="worlds-view-tabs__link">World Records</span>
      </div>

      <div className="worlds-dispatch-loading-card wr-skeleton">
        <Bar w="42%" h={13} />
        <Bar w="72%" h={16} />
        <div className="worlds-dispatch-loading-media" />
      </div>
    </main>
  )
}
