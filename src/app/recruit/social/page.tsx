import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import styles from './recruit-social.module.css'

const role = 'Social Media & Community Intern'
const description = 'Love games, sci-fi and fantasy? Create with AI, share our progress and connect with the Multiverse Collective community.'
export const metadata: Metadata = {
  title: `${role} — Multiverse Collective`,
  description,
  alternates: { canonical: 'https://multiverseco.org/recruit/social' },
  openGraph: {
    title: `${role} — Multiverse Collective`, description,
    url: 'https://multiverseco.org/recruit/social', type: 'website',
    images: [{ url: 'https://multiverseco.org/assets/recruit-social/social-recruitment-poster.png', width: 1080, height: 1350, alt: 'Can you make another universe go viral? Join Multiverse Collective as a Social Media & Community Intern.' }],
  },
  twitter: { card: 'summary_large_image', title: role, description, images: ['https://multiverseco.org/assets/recruit-social/social-recruitment-poster.png'] },
}

export default function SocialRecruitmentPage() {
  return (
    <main className={styles.page}>
      <article className={styles.letter} aria-labelledby="role-title">
        <header className={styles.brand}>
          <Image src="/assets/vi-wordmark.png" alt="Multiverse Collective" width={3699} height={1020} sizes="(min-width: 768px) 360px, 280px" priority className={styles.wordmark} />
          <Image src="/assets/vi-icon.png" alt="" width={881} height={492} sizes="96px" className={styles.symbol} />
        </header>
        <div className={styles.introduction}>
          <p className={styles.eyebrow}>We’re hiring · Internship</p>
          <h1 id="role-title">Social Media &amp;<br />Community <span>Intern</span></h1>
          <p className={styles.lead}>Love games, sci-fi &amp; fantasy?</p>
          <p>Help us share what we’re building and bring more people into the conversation.</p>
          <p>We’re looking for a curious, creative intern to help run our social channels and connect with our growing community.</p>
        </div>
        <section className={styles.section} aria-labelledby="responsibilities">
          <h2 id="responsibilities">What you’ll do</h2>
          <ul>
            <li>Turn website content, project updates and behind-the-scenes progress into engaging posts for Facebook and Instagram.</li>
            <li>Use AI tools to create visuals, edit videos and experiment with animation.</li>
            <li>Reply to comments and messages, spark conversations and help people feel welcome.</li>
          </ul>
          <p>There’s room to explore new formats and, in time, channels like TikTok and X.</p>
        </section>
        <section className={styles.section} aria-labelledby="requirements">
          <h2 id="requirements">Who you are</h2>
          <ul>
            <li>You love games and have a passion for sci-fi or fantasy worlds. You’re curious and excited to explore new ideas.</li>
            <li>You write clear, engaging English and enjoy connecting with people from different backgrounds.</li>
            <li>Hands-on experience with AI-powered video editing or animation is a strong plus.</li>
            <li>Experience living or studying in the U.S. is a plus. We especially welcome applicants currently based in the U.S.</li>
          </ul>
        </section>
        <footer className={styles.application}>
          <h2>Sound like you?</h2>
          <p>Send us a short introduction and something you’ve made, managed or feel proud of. AI-assisted edits and animations are welcome.</p>
          <p>Tell us about a game or fictional world you love, too.</p>
          <a className={styles.email} href="mailto:architect@multiverseco.org?subject=Social%20Media%20%26%20Community%20Intern%20Application">architect@multiverseco.org<span className={styles.emailHint}>Apply by email ↗</span></a>
          <Link className={`archive-button archive-button--secondary ${styles.dashboard}`} href="/console">Back to Dashboard</Link>
        </footer>
      </article>
    </main>
  )
}
