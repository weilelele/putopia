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
          <h1>Two review gates before publication</h1>
        </div>
        <p>
          First approve an English structural adaptation. Then review every English
          content item before it can be scheduled or published.
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
          <span>Publication rule</span>
          <strong>Only approved, current-version copy can publish</strong>
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
