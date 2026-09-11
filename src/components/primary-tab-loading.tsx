import { RootBrandHeader } from '@/components/root-brand-header'

export type PrimaryTabLoadingKind = 'collection' | 'dashboard' | 'media' | 'registry'

export function PrimaryTabLoadingBody({
  kind = 'collection',
  label = 'RETRIEVING ARCHIVE',
}: {
  kind?: PrimaryTabLoadingKind
  label?: string
}) {
  const showMetrics = kind === 'dashboard' || kind === 'registry'
  const showMedia = kind === 'media'

  return (
    <section className={`primary-tab-loading__content primary-tab-loading__content--${kind}`} aria-live="polite">
      <p className="primary-tab-loading__status" role="status">{label}</p>

      <div className={`primary-tab-loading__rail${showMetrics ? ' is-metrics' : ''}`} aria-hidden="true">
        {[0, 1, 2].map((item) => (
          <div className="primary-tab-loading__rail-item" key={item}>
            {showMetrics && <span className="primary-tab-loading__metric archive-route-skeleton" />}
            <span className="primary-tab-loading__rail-line archive-route-skeleton" />
          </div>
        ))}
      </div>

      <div className={`primary-tab-loading__lead${showMedia ? ' is-media' : ''}`} aria-hidden="true">
        <span className="primary-tab-loading__media archive-route-skeleton" />
        <span className="primary-tab-loading__copy">
          <span className="primary-tab-loading__line is-long archive-route-skeleton" />
          <span className="primary-tab-loading__line is-medium archive-route-skeleton" />
          <span className="primary-tab-loading__line is-short archive-route-skeleton" />
        </span>
      </div>

      <div className="primary-tab-loading__list" aria-hidden="true">
        {[0, 1, 2].map((item) => (
          <div className="primary-tab-loading__row" key={item}>
            <span className="primary-tab-loading__avatar archive-route-skeleton" />
            <span className="primary-tab-loading__copy">
              <span className="primary-tab-loading__line is-medium archive-route-skeleton" />
              <span className="primary-tab-loading__line is-short archive-route-skeleton" />
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export function PrimaryTabLoading({
  kind = 'collection',
  label = 'RETRIEVING ARCHIVE',
}: {
  kind?: PrimaryTabLoadingKind
  label?: string
}) {
  return (
    <main
      className={`main primary-tab-loading primary-tab-loading--${kind}`}
      aria-busy="true"
      aria-label="Loading selected tab"
      data-route-scroll
    >
      <h1 className="sr-only">Loading selected tab</h1>
      <RootBrandHeader />
      <PrimaryTabLoadingBody kind={kind} label={label} />
    </main>
  )
}
