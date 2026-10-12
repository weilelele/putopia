import styles from './signal-description.module.css'

// Chinese source copy: 这几个信号记录，哪个和描述内容最像？
export const SIGNAL_DESCRIPTION_QUESTION = 'Which of these signal recordings most closely matches the description?'

export function SignalDescription({ description }: { description?: string | null }) {
  return <div className={styles.context}>
    <div className={styles.label}>ORIGINAL DESCRIPTION</div>
    <p className={styles.description}>{description?.trim() ? description : 'The original description is unavailable.'}</p>
    <p className={styles.question}>{SIGNAL_DESCRIPTION_QUESTION}</p>
  </div>
}

export function SignalVotingRules({ initiatorOnly }: { initiatorOnly?: boolean }) {
  return <details className={styles.rules}>
    <summary>Voting details</summary>
    <p>{initiatorOnly
      ? 'Voting ended without responses. Only the original submitter can choose a signal to start the next round.'
      : 'Voting stays open for 36 hours. At least one response is needed to continue.'}</p>
  </details>
}
