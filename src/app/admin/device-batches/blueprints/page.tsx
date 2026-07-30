import type { Metadata } from 'next'
import { StoryBlueprintBrowser } from './story-blueprint-browser'
import styles from './story-blueprints.module.css'

export const metadata: Metadata = {
  title: 'Batch Story Lab — Multiverse Collective',
}

export default function BatchStoryBlueprintsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span>BATCH STORY LAB</span>
          <h1>Three Device Recovery Stories</h1>
        </div>
        <p>
          Compare each Batch&apos;s emotional core, factual boundaries, visual identity, and complete
          content path. This is a collaborative working draft, not an inventory, price, date, or Pack commitment.
        </p>
      </header>

      <section className={styles.rules} aria-label="Shared rules">
        <div>
          <span>Discovery window</span>
          <strong>Within the past year</strong>
        </div>
        <div>
          <span>Between Batches</span>
          <strong>Different color and appearance</strong>
        </div>
        <div>
          <span>Within one Batch</span>
          <strong>Every Unit looks identical</strong>
        </div>
      </section>

      <StoryBlueprintBrowser />
    </div>
  )
}
