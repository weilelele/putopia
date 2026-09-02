import type { Metadata } from 'next'
import { listStoryWorkflows } from '@/lib/story-workflow-repository'
import { StoryBlueprintBrowser } from './story-blueprint-browser'
import styles from './story-blueprints.module.css'

export const metadata: Metadata = {
  title: 'Story Lab — Multiverse Collective',
}

export const dynamic = 'force-dynamic'

export default async function BatchStoryBlueprintsPage() {
  const result = await listStoryWorkflows()

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span>STORY LAB</span>
          <h1>Review first. Publish manually.</h1>
        </div>
        <p>
          Approve the story structure and each content item. Publish Device updates
          from the Batch editor, then record the release here. Automatic publication
          is paused; recommended dates do not trigger a release.
        </p>
      </header>

      <section className={styles.rules} aria-label="Story Lab review rules">
        <div>
          <span>Review Gate 1</span>
          <strong>Approve the story structure</strong>
        </div>
        <div>
          <span>Review Gate 2</span>
          <strong>Approve every content item</strong>
        </div>
        <div>
          <span>Manual publication</span>
          <strong>Publish in the intended channel, then record the release</strong>
        </div>
      </section>

      <StoryBlueprintBrowser
        setupError={result.error}
        setupRequired={result.setupRequired}
        workflows={result.workflows}
      />
    </div>
  )
}
