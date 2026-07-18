import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchiveLinkCard } from '@/components/archive-link-card'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import { ArchiveStatStrip } from '@/components/archive-stat-strip'
import { ArchiveTabsDemo } from './archive-tabs-demo'

export default function UiKitPreview() {
  return (
    <main className="uk-root">
      <header className="uk-header">
        <p>Multiverse Collective Design System</p>
        <h1>MINIMAL ARCHIVE</h1>
        <span>PANTONE 1665 C</span>
      </header>

      <div className="uk-grid">
        <section className="uk-section">
          <ArchiveSectionLabel>BUTTONS</ArchiveSectionLabel>
          <div className="uk-stack">
            <ArchiveButton fullWidth>PRIMARY ACTION</ArchiveButton>
            <ArchiveButton fullWidth variant="secondary">SECONDARY ACTION</ArchiveButton>
            <ArchiveButton fullWidth variant="ghost">GHOST ACTION</ArchiveButton>
            <ArchiveButton disabled fullWidth>DISABLED ACTION</ArchiveButton>
            <ArchiveLinkButton fullWidth href="/login">LINK ACTION</ArchiveLinkButton>
          </div>
        </section>

        <section className="uk-section">
          <ArchiveSectionLabel>FORM ELEMENTS</ArchiveSectionLabel>
          <div className="uk-stack">
            <ArchiveField htmlFor="ui-name" label="NAME">
              <input id="ui-name" defaultValue="Mira Solace" />
            </ArchiveField>
            <ArchiveField htmlFor="ui-email" label="EMAIL ADDRESS">
              <input id="ui-email" defaultValue="mira@multiverse.co" type="email" />
            </ArchiveField>
            <ArchiveField htmlFor="ui-message" label="MESSAGE">
              <textarea id="ui-message" defaultValue="Building better worlds, together." />
            </ArchiveField>
          </div>
        </section>

        <section className="uk-section uk-span">
          <ArchiveSectionLabel>STATISTICS</ArchiveSectionLabel>
          <ArchiveStatStrip items={[
            { label: 'Architects', value: 6, color: 'var(--color-nucleus)' },
            { label: 'New Batch', value: 53, color: 'var(--color-ok)' },
            { label: 'All Voyagers', value: 66, color: 'var(--color-warn)' },
          ]} />
        </section>

        <section className="uk-section uk-span">
          <ArchiveSectionLabel>SEGMENTED SELECTION</ArchiveSectionLabel>
          <ArchiveTabsDemo />
        </section>

        <section className="uk-section uk-span">
          <ArchiveSectionLabel>CONTENT CARD</ArchiveSectionLabel>
          <ArchiveCard>
            <h3>PARALLEL WORLD INDEX</h3>
            <p>Shared components keep typography, spacing, interaction states, and brand color consistent across every route.</p>
            <ArchiveLinkButton href="/voyagers" variant="ghost">OPEN VOYAGERS</ArchiveLinkButton>
          </ArchiveCard>
          <ArchiveLinkCard href="/worlds">
            <h3>NAVIGABLE ARCHIVE CARD</h3>
            <p>The entire card is a clear, keyboard-accessible destination.</p>
          </ArchiveLinkCard>
        </section>
      </div>

      <footer className="uk-footer">
        <span>COURIER PRIME</span>
        <span>FLAT COLOR · WARM HAIRLINE · ONE CLIPPED CORNER</span>
      </footer>
    </main>
  )
}
