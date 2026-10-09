'use client'

import { useState } from 'react'
import { ArchiveSheet } from '@/components/archive-sheet'
import { ArchiveButton } from '@/components/archive-button'
import profileStyles from '@/components/member-profile-sheet.module.css'

const sections = [
  ['Before you begin', 'Find a quiet place and give yourself time to look. Small details are often easier to notice when you are not rushing.'],
  ['What to record', 'Write down what you can see and hear. Include changes in light, movement, or sound. Keep observations separate from your interpretation.'],
  ['Add context', 'A location and a short description can help you return to an observation later. Share only details you are comfortable making public.'],
  ['Returning later', 'Read your earlier notes before adding a new entry. This can help you notice changes that were difficult to see at first.'],
  ['Take your time', 'There is no need to finish in one sitting. Return when you have something new to record.'],
]

/** Local fixtures only: never loads a member or invokes a product action. */
export function DialogExamples() {
  const [example, setExample] = useState<string | null>(null)
  const [continued, setContinued] = useState(false)
  const close = () => setExample(null)
  return <>
    <p>Centered dialogs · local examples, no product data changes.</p>
    <div className="archive-sheet__actions">
      <ArchiveButton variant="secondary" onClick={() => setExample('info')}>Short explanation</ArchiveButton>
      <ArchiveButton variant="secondary" onClick={() => setExample('confirm')}>With buttons</ArchiveButton>
      <ArchiveButton variant="secondary" onClick={() => setExample('profile')}>Member details</ArchiveButton>
      <ArchiveButton variant="secondary" onClick={() => setExample('reading')}>Long reading</ArchiveButton>
    </div>
    {continued && <p role="status">Example completed. No navigation or purchase occurred.</p>}
    <ArchiveSheet open={example === 'info'} title="Initiated places" onClose={close}>
      <p>Includes purchased, gifted, and story-character places.</p>
    </ArchiveSheet>
    <ArchiveSheet open={example === 'confirm'} title="Continue to Initiation?" onClose={close} footer={<div className="archive-sheet__actions">
      <ArchiveButton variant="secondary" onClick={close}>Cancel</ArchiveButton>
      <ArchiveButton onClick={() => { setContinued(true); close() }}>Continue</ArchiveButton>
    </div>}>
      <p>Complete Voyager Initiation before claiming a Console.</p><p>You can return here after joining.</p>
    </ArchiveSheet>
    <ArchiveSheet open={example === 'profile'} title="Voyager profile" onClose={close}>
      <div className={profileStyles.profile}>
        <div className={profileStyles.identity}><span className={profileStyles.avatar} aria-hidden>AM</span><div><h3>Alex Morgan</h3><p>Voyager · S26</p><p>London, UK</p></div></div>
        <p className={profileStyles.meta}>Illustrative profile · fictional sample</p>
        <p className={profileStyles.bio}>I collect small observations from unfamiliar places. Interested in sound, weather, and the stories people leave behind.</p>
        <dl className={profileStyles.stats}><div><dt>Observation days</dt><dd>128</dd></div><div><dt>Worlds discovered</dt><dd>3</dd></div></dl>
        <p>Usually listening before speaking. Currently exploring how cities change after dark.</p>
      </div>
    </ArchiveSheet>
    <ArchiveSheet open={example === 'reading'} title="Observation guide" onClose={close} footer={<ArchiveButton fullWidth onClick={close}>Done</ArchiveButton>}>
      <p>A few notes for your next observation.</p>
      {sections.map(([title, body]) => <section key={title}><h3>{title}</h3><p>{body}</p></section>)}
    </ArchiveSheet>
  </>
}
