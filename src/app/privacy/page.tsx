import type { Metadata } from 'next'
import styles from './privacy.module.css'

export const metadata: Metadata = {
  title: 'Privacy Policy — Multiverse Collective',
  description: 'How Multiverse Collective collects, uses and shares personal data.',
}

const CONTACT = 'voyagers@multiverseco.org'
const UPDATED = 'October 8, 2026'

const sections: { title: string; body: React.ReactNode }[] = [
  {
    title: 'Who we are',
    body: (
      <p>
        Multiverse Collective (“we”, “us”) runs the Multiverse Collective website and iOS app,
        the community platform of the Multiverse Collective, an alternate reality game. This
        policy applies to the website at multiverseco.org and to the iOS app, which displays
        that website. Questions: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    ),
  },
  {
    title: 'What we collect',
    body: (
      <ul>
        <li><strong>Account data</strong> — email address, display name or handle, and profile details you choose to add, such as a photo or location.</li>
        <li><strong>Content you submit</strong> — comments, votes, observations, and photos or media you upload.</li>
        <li><strong>Orders</strong> — if you reserve or buy a device or pack: what you ordered, delivery details, and order status. Card details are entered with our payment processor, Stripe, and never reach our servers.</li>
        <li><strong>Notification data</strong> — if you allow push notifications, a device token issued by Apple, so we can send organization updates.</li>
        <li><strong>Usage data</strong> — pages viewed, buttons tapped and similar interactions, plus basic device, browser and approximate location information, linked to your account when you are signed in.</li>
        <li><strong>Advertising measurement data</strong> — when you visit our website in a browser, pixels from Meta, X and Reddit measure how our campaigns perform. They may receive page visits and, for sign-ups and purchases, an event with hashed contact details. None of this runs in the iOS app: no advertising pixels are loaded there and purchases or sign-ups made in the app are not reported to advertising platforms.</li>
      </ul>
    ),
  },
  {
    title: 'How we use it',
    body: (
      <ul>
        <li>To run your account and the features you use: reading and posting, voting, submitting observations, and fulfilling orders.</li>
        <li>To send service messages, such as sign-in links, order updates and the notifications you enabled.</li>
        <li>To understand how the product is used and to fix problems.</li>
        <li>To measure advertising for the organization.</li>
        <li>To keep the platform safe and to meet legal obligations.</li>
      </ul>
    ),
  },
  {
    title: 'Who we share it with',
    body: (
      <>
        <p>We do not sell your personal data. We share it only with providers that help us run the service:</p>
        <ul>
          <li>Supabase and MongoDB — account and content storage.</li>
          <li>Vercel — website hosting.</li>
          <li>Stripe — payment processing.</li>
          <li>Resend — transactional and organization email.</li>
          <li>PostHog — product analytics.</li>
          <li>Meta, X and Reddit — advertising measurement on the website only, as described above.</li>
          <li>Apple — delivery of push notifications.</li>
        </ul>
        <p>
          Content you post in public areas, and your display name, may be visible to other
          visitors. Some sections are readable without an account.
        </p>
      </>
    ),
  },
  {
    title: 'Offline copy on iOS',
    body: (
      <p>
        The iOS app keeps a read-only copy of recently loaded public content on your device so
        it can be shown without a connection. It does not include your credentials, classified
        Intel, comments, drafts or individual votes.
      </p>
    ),
  },
  {
    title: 'Reporting, blocking and moderation',
    body: (
      <p>
        Under any post in discussions, chat and world reports you can choose Report, which
        hides the post for you and sends it to our team, or Block, which hides that member&rsquo;s
        posts from you. We review reports within 24 hours and remove content that breaks the
        rules. Blocked members are listed in My Profile, where you can unblock them.
      </p>
    ),
  },
  {
    title: 'Retention and your choices',
    body: (
      <>
        <p>
          We keep account and content data while your account is active and for as long as
          needed to run the service, resolve disputes and meet legal obligations.
        </p>
        <p>
          You can delete your account at any time in the app or website under My Profile →
          Delete my account. This removes your profile, sign-in, comments, chat messages, world
          reports, uploaded images, votes, notification settings and mailing-list entry. Order
          and shipping records are kept without a link to your account because we need them
          for fulfilment, tax and accounting. If you still hold a device, it stays registered
          to a deleted account. You can turn off push notifications in iOS Settings at any time.
        </p>
        <p>
          To access or correct your data, or to opt out of advertising measurement on the
          website, email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> from the address on your
          account and we will respond within 30 days.
        </p>
      </>
    ),
  },
  {
    title: 'Children',
    body: <p>The service is not directed to children under 13, and we do not knowingly collect their personal data.</p>,
  },
  {
    title: 'Changes',
    body: <p>If we change this policy we will update the date above and, for material changes, tell you in the app or by email.</p>,
  },
]

export default function PrivacyPage() {
  return (
    <main className="main">
      <article className={styles.doc}>
        <h1>PRIVACY POLICY</h1>
        <p className={styles.updated}>Last updated {UPDATED}</p>
        {sections.map((s) => (
          <section key={s.title}>
            <h2>{s.title.toUpperCase()}</h2>
            {s.body}
          </section>
        ))}
      </article>
    </main>
  )
}
