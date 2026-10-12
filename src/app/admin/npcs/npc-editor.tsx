'use client'

import { useState, type ReactNode, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArchiveButton } from '@/components/archive-button'
import { saveNpc, setNpcDevice, uploadNpcAvatar } from '@/lib/actions/npcs'
import { setDeviceGrant } from '@/lib/actions/device-status'
import { NPC_ROLE_OPTIONS, type NpcProfileInput, type NpcInitiationState } from '@/lib/npc-model'
import type { UserRole } from '@/types/database'
import styles from './npcs.module.css'

type Profile = { id: string; display_name: string; role: UserRole; bio: string | null; avatar_url: string | null; location: string | null; batch_label: string }
type Batch = { slug: string; name: string; listing_quantity: number; claimed_quantity: number; reserved_quantity: number; allocated_quantity?: number }
type Unit = { user_id: string | null; batch_slug: string; unit_code: string }

export function NpcEditor({ profile, batches, units, memberBatches, initiation, deviceStatus }: { profile?: Profile; batches: Batch[]; units: Unit[]; memberBatches: string[]; initiation: NpcInitiationState; deviceStatus: { granted: boolean; available: boolean } }) {
  const router = useRouter()
  const [input, setInput] = useState<NpcProfileInput>({ displayName: profile?.display_name ?? '', role: profile?.role ?? 'guest', bio: profile?.bio ?? '', avatarUrl: profile?.avatar_url ?? '', location: profile?.location ?? '', batchLabel: profile?.batch_label ?? '', grantNote: '' })
  const [draftId, setDraftId] = useState<string | null>(profile?.id ?? null)
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
    await run(async () => {
      const result = await saveNpc(draftId, input)
      if (result.id) setDraftId(result.id)
      if (!result.error && !profile && result.id) router.replace(`/admin/npcs/${result.id}`)
      return result
    }, 'Profile saved.')
  }

  return <article className={styles.editor}>
    <header className={styles.heading}>
      <h2>{profile?.display_name ?? 'New NPC'}</h2><span>OFFICIAL NPC</span>
    </header>
    <form onSubmit={submit} className={styles.form}>
      <fieldset disabled={busy} className={styles.fields}>
        <NpcField htmlFor={`${prefix}-name`} label="Name"><input id={`${prefix}-name`} required maxLength={80} value={input.displayName} onChange={(e) => setInput({ ...input, displayName: e.target.value })} /></NpcField>
        <NpcField htmlFor={`${prefix}-role`} label="Identity type">
          <select id={`${prefix}-role`} value={input.role} onChange={(e) => setInput({ ...input, role: e.target.value as UserRole })}>
            {NPC_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <small className={styles.hint}>Controls how this character is identified. NPC accounts remain managed by architects and cannot sign in.</small>
        </NpcField>
        <NpcField htmlFor={`${prefix}-member-batch`} label="Voyager member batch">
          <select id={`${prefix}-member-batch`} required value={input.batchLabel} aria-describedby={`${prefix}-member-batch-help`} onChange={(e) => setInput({ ...input, batchLabel: e.target.value })}>
            <option value="" disabled>Choose a member batch</option>
            {memberBatches.map((label) => <option key={label} value={label}>{label}</option>)}
          </select>
          <small id={`${prefix}-member-batch-help`} className={styles.hint}>
            {profile ? `Saved batch: ${profile.batch_label}. ` : 'Select the intended cohort explicitly. '}
            S26 registration uses one of the 100 member places. It creates no payment, shipment or Console entitlement. Registered NPCs cannot leave S26 without management review.
          </small>
        </NpcField>
        <p role="status">
          S26: {initiation.occupied} / {initiation.capacity} places occupied.
          {' '}{initiation.member ? `Registered (${initiation.member.source}, ${initiation.member.active ? 'active' : 'inactive — place retained'}).` : 'Not registered.'}
          {!initiation.member && initiation.occupied >= initiation.capacity && ' S26 is full.'}
        </p>
        {input.batchLabel === 'S26' && !initiation.member && <NpcField htmlFor={`${prefix}-grant-note`} label="S26 grant audit note">
          <textarea id={`${prefix}-grant-note`} required maxLength={1000} rows={3} value={input.grantNote} onChange={(e) => setInput({ ...input, grantNote: e.target.value })} />
          <small className={styles.hint}>Saving registers this NPC as a granted member and reserves one place. Explain the approval for this grant.</small>
        </NpcField>}
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
        <div className={styles.actions}><ArchiveButton type="submit" disabled={busy}>{busy ? 'Saving…' : profile ? 'Save profile' : 'Create NPC'}</ArchiveButton></div>
      </fieldset>
    </form>
    {profile && <section className={styles.devices}>
      <h3>Device status · {deviceStatus.granted ? 'Has device' : 'No device'}</h3>
      <p className={styles.hint}>Controls whether this NPC can report observations and anomalies in Worlds. It is separate from the batch allocation below, which only configures devices.</p>
      {deviceStatus.available
        ? <ArchiveButton variant={deviceStatus.granted ? 'secondary' : 'primary'} disabled={busy} onClick={() => run(() => setDeviceGrant(profile.id, !deviceStatus.granted), deviceStatus.granted ? 'Device status removed.' : 'Device status granted.')}>{deviceStatus.granted ? 'Remove device status' : 'Grant device status'}</ArchiveButton>
        : <p role="alert">Device status is not available yet. Apply schema_v83 first.</p>}
    </section>}
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
