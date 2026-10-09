'use client'

import { useState, type FormEvent } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import { saveNpcVoice } from '@/lib/actions/npc-voice'
import styles from './npcs.module.css'

export function NpcVoiceEditor({ id, initialValue }: { id: string; initialValue: string }) {
  const [value, setValue] = useState(initialValue)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const result = await saveNpcVoice(id, value)
      setMessage(result.error ?? 'Language and behavior saved.')
    } catch { setMessage('Could not save. Please retry.') }
    finally { setBusy(false) }
  }
  return <section className={styles.editor}>
    <h2>Language and behavior</h2>
    <p className={styles.hint}>Private character notes for future comment drafts. Saving does not publish comments.</p>
    <form className={`${styles.form} ${styles.fields}`} onSubmit={submit}>
      <div className={styles.field}>
        <label htmlFor="npc-voice">Language, tone, interests, writing habits and example replies</label>
        <textarea id="npc-voice" rows={16} maxLength={12000} value={value} disabled={busy} onChange={(event) => setValue(event.target.value)} />
      </div>
      <ArchiveButton type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save language and behavior'}</ArchiveButton>
      <p role="status" aria-live="polite">{message}</p>
    </form>
  </section>
}
