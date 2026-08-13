'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  Archive,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  CircleUserRound,
  Compass,
  LockKeyhole,
  RadioTower,
} from 'lucide-react'
import { useState } from 'react'
import styles from './golden-screens.module.css'

const signalOptions = [
  { id: 'mineral', key: 'A', label: 'Mineral fracture' },
  { id: 'echo', key: 'B', label: 'Atmospheric echo' },
  { id: 'relay', key: 'C', label: 'Artificial relay' },
]

function ScreenCaption({ children, index }: { children: React.ReactNode; index: string }) {
  return (
    <header className={styles.caption}>
      <span>{index}</span>
      <p>{children}</p>
    </header>
  )
}

function WorldRecordsScreen() {
  return (
    <article className={styles.example}>
      <ScreenCaption index="01">CONTENT DISCOVERY</ScreenCaption>
      <div className={styles.screen}>
        <header className={styles.screenHeading}>
          <h3>WORLD RECORDS</h3>
          <p>Observed worlds and active transmissions.</p>
        </header>

        <section className={styles.featuredRecord}>
          <div className={styles.mediaFrame}>
            <Image
              alt="A radio telescope surveying a dark extraterrestrial field"
              fill
              sizes="(max-width: 767px) calc(100vw - 64px), 342px"
              src="/assets/ui-kit/world-records-antenna.png"
            />
          </div>
          <div className={styles.featuredCopy}>
            <div>
              <h4>ANTENNA FIELDS</h4>
              <p>Signal stable</p>
            </div>
            <Link className={styles.primaryAction} href="/worlds">
              OPEN RECORD
              <ArrowRight aria-hidden="true" size={20} strokeWidth={1.5} />
            </Link>
          </div>
        </section>

        <section className={styles.recentRecords} aria-labelledby="recent-records-title">
          <div className={styles.sectionHeading}>
            <h4 id="recent-records-title">RECENT</h4>
            <Link href="/worlds">FILTER</Link>
          </div>
          {['Salt Orbit', 'Glass Meridian'].map((record) => (
            <Link className={styles.recordRow} href="/worlds" key={record}>
              <span>{record}</span>
              <ArrowRight aria-hidden="true" size={20} strokeWidth={1.5} />
            </Link>
          ))}
        </section>

        <nav className={styles.mobileNav} aria-label="Content example navigation">
          <Link href="/console"><Compass aria-hidden="true" size={22} />EXPLORE</Link>
          <Link className={styles.activeNav} href="/worlds"><RadioTower aria-hidden="true" size={22} />RECORDS</Link>
          <Link href="/logs"><Archive aria-hidden="true" size={22} />ARCHIVE</Link>
        </nav>
      </div>
    </article>
  )
}

function SignalCheckScreen() {
  const [selected, setSelected] = useState('echo')
  const [submitted, setSubmitted] = useState(false)

  return (
    <article className={styles.example}>
      <ScreenCaption index="02">FOCUSED PARTICIPATION</ScreenCaption>
      <div className={styles.screen}>
        <Link className={styles.backAction} href="/signal">
          <ChevronLeft aria-hidden="true" size={20} />
          BACK
        </Link>

        <header className={styles.taskHeading}>
          <h3>SIGNAL CHECK</h3>
          <span>02 / 05</span>
          <div className={styles.progressTrack} aria-label="Question 2 of 5">
            <span />
          </div>
        </header>

        <section className={styles.taskBody}>
          <h4>Which trace belongs to this world?</h4>
          <div className={styles.evidenceFrame}>
            <Image
              alt="Branching mineral fractures across a barren plain"
              fill
              sizes="(max-width: 767px) calc(100vw - 64px), 342px"
              src="/assets/ui-kit/signal-check-mineral-plain.png"
            />
          </div>
          <div className={styles.choiceGroup} aria-label="Observation choices" role="radiogroup">
            {signalOptions.map((option) => {
              const active = selected === option.id
              return (
                <button
                  aria-checked={active}
                  className={active ? styles.activeChoice : undefined}
                  key={option.id}
                  onClick={() => {
                    setSelected(option.id)
                    setSubmitted(false)
                  }}
                  role="radio"
                  type="button"
                >
                  <span>{option.key}</span>
                  {option.label}
                </button>
              )
            })}
          </div>
        </section>

        <button className={styles.primaryAction} onClick={() => setSubmitted(true)} type="button">
          {submitted ? 'OBSERVATION RECORDED' : 'SUBMIT OBSERVATION'}
          {submitted && <Check aria-hidden="true" size={20} />}
        </button>
      </div>
    </article>
  )
}

function VoyagerRecordScreen() {
  return (
    <article className={styles.example}>
      <ScreenCaption index="03">IDENTITY &amp; PROGRESS</ScreenCaption>
      <div className={styles.screen}>
        <header className={styles.identityHeading}>
          <p>VOYAGER RECORD</p>
          <div>MIRA SOLACE</div>
        </header>

        <section className={styles.pathSection} aria-labelledby="world-builder-path">
          <h3 id="world-builder-path">WORLD BUILDER PATH</h3>
          <ol className={styles.pathSteps}>
            <li>
              <span className={styles.stepIcon}><Check aria-hidden="true" size={18} /></span>
              <strong>APPLICANT</strong>
            </li>
            <li className={styles.activeStep}>
              <span className={styles.stepIcon}><RadioTower aria-hidden="true" size={18} /></span>
              <strong>VOYAGER</strong>
              <small>ACTIVE</small>
            </li>
            <li>
              <span className={styles.stepIcon}><LockKeyhole aria-hidden="true" size={17} /></span>
              <strong>ARCHITECT</strong>
            </li>
          </ol>
        </section>

        <section className={styles.assignment}>
          <p>NEXT ASSIGNMENT</p>
          <h4>Complete signal check</h4>
          <span>One observation remains before the next transmission.</span>
        </section>

        <div className={styles.pathActions}>
          <Link className={styles.primaryAction} href="/voyager-path">CONTINUE PATH</Link>
          <Link className={styles.textAction} href="/logs">VIEW LOGS</Link>
        </div>

        <nav className={styles.mobileNav} aria-label="Progress example navigation">
          <Link href="/logs"><BookOpen aria-hidden="true" size={22} />LOGS</Link>
          <Link className={styles.activeNav} href="/voyager-path"><RadioTower aria-hidden="true" size={22} />PATH</Link>
          <Link href="/profile"><CircleUserRound aria-hidden="true" size={22} />PROFILE</Link>
        </nav>
      </div>
    </article>
  )
}

export function GoldenScreens() {
  return (
    <div className={styles.root}>
      <p className={styles.intro}>
        Three portrait-first composition references. Copy their hierarchy and restraint;
        adapt the content and interaction model to the route.
      </p>
      <div className={styles.examples}>
        <WorldRecordsScreen />
        <SignalCheckScreen />
        <VoyagerRecordScreen />
      </div>
    </div>
  )
}
