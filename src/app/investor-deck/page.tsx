import Image from 'next/image'
import { unlockInvestorDeck } from './actions'
import { hasDeckAccess } from './auth'
import InvestorDeck from './investor-deck'
import styles from './investor-deck.module.css'

export const dynamic = 'force-dynamic'

export async function InvestorDeckView({
  searchParams,
  returnTo,
}: {
  searchParams: Promise<{ error?: string }>
  returnTo: '/investor-deck' | '/public-info'
}) {
  const unlocked = await hasDeckAccess()

  if (unlocked) return <InvestorDeck />

  const { error } = await searchParams

  return (
    <main className={styles.gate}>
      <section className={styles.gatePanel} aria-labelledby="deck-access-title">
        <div className={styles.gateBrand}>
          <Image src="/assets/vi-icon.png" width={881} height={492} alt="" priority />
          <Image src="/assets/vi-wordmark.png" width={3699} height={1020} alt="Multiverse Collective" priority />
        </div>

        <div className={styles.gateCopy}>
          <p className={styles.eyebrow}>LIMITED INTELLIGENCE ABOUT US</p>
          <h1 id="deck-access-title">Restricted Access</h1>
          <p>Enter the access password issued by the Parallel World Observation Organization.</p>
        </div>

        <form action={unlockInvestorDeck} className={styles.gateForm}>
          <input type="hidden" name="returnTo" value={returnTo} />
          <label htmlFor="deck-password">ACCESS PASSWORD</label>
          <input
            id="deck-password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            aria-describedby={error ? 'deck-password-error' : undefined}
          />
          {error && <p className={styles.gateError} id="deck-password-error">Incorrect password. Please try again.</p>}
          <button type="submit">ENTER BRIEFING</button>
        </form>

        <p className={styles.gateFoot}>MULTIVERSE COLLECTIVE · AUTHORIZED ACCESS ONLY</p>
      </section>
    </main>
  )
}

export default function InvestorDeckPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return <InvestorDeckView searchParams={searchParams} returnTo="/investor-deck" />
}
