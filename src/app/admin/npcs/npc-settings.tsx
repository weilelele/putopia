'use client'

import { useState, type ReactNode, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArchiveButton } from '@/components/archive-button'
import { saveNpc, setNpcDevice, uploadNpcAvatar } from '@/lib/actions/npcs'
import type { NpcProfileInput } from '@/lib/npc-model'
import styles from './npcs.module.css'

type Profile = { id: string; display_name: string; bio: string | null; avatar_url: string | null; location: string | null }
type Batch = { slug: string; name: string; listing_quantity: number; claimed_quantity: number; reserved_quantity: number; allocated_quantity?: number }
type Unit = { user_id: string | null; batch_slug: string; unit_code: string }

export function NpcSettings({ profiles, batches, units }: { profiles: Profile[]; batches: Batch[]; units: Unit[] }) {
  const [creating, setCreating] = useState(false)
  return <section className={styles.page}>
    <header className={styles.heading}><h1>NPC settings</h1><ArchiveButton onClick={() => setCreating(true)} disabled={creating}>Create NPC</ArchiveButton></header>
    <p>Manage official characters and their devices. Each allocation uses one Batch slot. Releasing it makes the device available again.</p>
    {creating && <NpcEditor batches={batches} units={[]} onClose={() => setCreating(false)} />}
    {!profiles.length && !creating && <p>No NPCs yet. Create a character, then allocate a device.</p>}
    {profiles.map((profile) => <NpcEditor key={profile.id} profile={profile} batches={batches} units={units.filter((unit) => unit.user_id === profile.id)} />)}
  </section>
}

function NpcEditor({ profile, batches, units, onClose }: { profile?: Profile; batches: Batch[]; units: Unit[]; onClose?: () => void }) {
  const router = useRouter()
  const [input, setInput] = useState<NpcProfileInput>({ displayName: profile?.display_name ?? '', bio: profile?.bio ?? '', avatarUrl: profile?.avatar_url ?? '', location: profile?.location ?? '' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [batchSlug, setBatchSlug] = useState('')
  const prefix = profile?.id ?? 'new-npc'

  async function run(action: () => Promise<{ error: string | null }>, success: string) {
    setBusy(true)
    setMessage('')
    try {
      const result = await action()
      setMessage(result.error ?? success)
      if (!result.error) router.refresh()
      return !result.error
    } catch { setMessage('Could not complete the request. Please try again.'); return false }
    finally { setBusy(false) }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (await run(() => saveNpc(profile?.id ?? null, input), 'Profile saved.')) onClose?.()
  }

  return <article className={styles.editor}>
    <header className={styles.heading}>
      <h2>{profile?.display_name ?? 'New NPC'}</h2><span>OFFICIAL NPC</span>
    </header>
    <form onSubmit={submit} className={styles.form}>
      <fieldset disabled={busy} className={styles.fields}>
        <NpcField htmlFor={`${prefix}-name`} label="Name"><input id={`${prefix}-name`} required maxLength={80} value={input.displayName} onChange={(e) => setInput({ ...input, displayName: e.target.value })} /></NpcField>
        <NpcField htmlFor={`${prefix}-bio`} label="Bio"><textarea id={`${prefix}-bio`} maxLength={2000} rows={3} value={input.bio} onChange={(e) => setInput({ ...input, bio: e.target.value })} /></NpcField>
        <NpcField htmlFor={`${prefix}-location`} label="Location"><input id={`${prefix}-location`} maxLength={120} value={input.location} onChange={(e) => setInput({ ...input, location: e.target.value })} /></NpcField>
        <NpcField htmlFor={`${prefix}-avatar`} label="Avatar URL (HTTPS)"><input id={`${prefix}-avatar`} type="url" value={input.avatarUrl} onChange={(e) => setInput({ ...input, avatarUrl: e.target.value })} /></NpcField>
        {input.avatarUrl.startsWith('https://') && <div className={styles.avatar}>
          {/* eslint-disable-next-line @next/next/no-img-element -- NPC avatars support administrator-supplied HTTPS URLs. */}
          <img src={input.avatarUrl} alt={`${input.displayName || 'NPC'} avatar`} width={64} height={64} />
        </div>}
        {profile && <NpcField htmlFor={`${prefix}-upload`} label="Upload avatar (JPEG, PNG, WebP · under 750 KB)">
          <input id={`${prefix}-upload`} type="file" accept="image/jpeg,image/png,image/webp" onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file) return
            const form = new FormData(); form.set('avatar', file)
            await run(async () => {
              const result = await uploadNpcAvatar(profile.id, form)
              if (result.url) setInput((previous) => ({ ...previous, avatarUrl: result.url! }))
              return result
            }, 'Avatar saved.')
            event.target.value = ''
          }} />
        </NpcField>}
        <div className={styles.actions}><ArchiveButton type="submit" disabled={busy}>{busy ? 'Saving…' : profile ? 'Save profile' : 'Create NPC'}</ArchiveButton>{onClose && <ArchiveButton variant="ghost" onClick={onClose}>Cancel</ArchiveButton>}</div>
      </fieldset>
    </form>
    {profile && <section className={styles.devices}>
      <h3>Devices · {units.length}</h3>
      {units.map((unit) => <div key={unit.unit_code} className={styles.unit}>
        <div><strong>{unit.unit_code}</strong><p>{batches.find((batch) => batch.slug === unit.batch_slug)?.name ?? unit.batch_slug}</p></div>
        <ArchiveButton variant="secondary" disabled={busy} onClick={() => run(() => setNpcDevice(profile.id, unit.batch_slug, false), 'Device released. One slot is available again.')}>Release device</ArchiveButton>
      </div>)}
      <NpcField htmlFor={`${prefix}-batch`} label="Allocate a device from Batch">
        <select id={`${prefix}-batch`} value={batchSlug} disabled={busy} onChange={(e) => setBatchSlug(e.target.value)}>
          <option value="">Choose a Batch</option>
          {batches.map((batch) => {
            const remaining = Math.max(0, batch.listing_quantity - batch.claimed_quantity - batch.reserved_quantity)
            const held = units.some((unit) => unit.batch_slug === batch.slug)
            return <option key={batch.slug} value={batch.slug} disabled={!remaining || held}>{batch.name} · {held ? 'Already allocated' : `${remaining} available · ${batch.allocated_quantity ?? 0} official`}</option>
          })}
        </select>
      </NpcField>
      <ArchiveButton disabled={busy || !batchSlug || units.some((unit) => unit.batch_slug === batchSlug)} onClick={async () => {
        if (await run(() => setNpcDevice(profile.id, batchSlug, true), 'Device allocated. One Batch slot has been used.')) setBatchSlug('')
      }}>Allocate device</ArchiveButton>
    </section>}
    <p role="status" aria-live="polite">{message}</p>
  </article>
}

function NpcField({ htmlFor, label, children }: { htmlFor: string; label: string; children: ReactNode }) {
  return <div className={styles.field}><label htmlFor={htmlFor}>{label}</label>{children}</div>
}
