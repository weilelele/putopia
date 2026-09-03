'use client'

import { ArchiveField } from '@/components/archive-field'
import type { DeviceCameraBinding } from '@/lib/device-camera'
import styles from './batch-config-editor.module.css'

export function BatchCameraFields({ value, onChange }: { value?: DeviceCameraBinding; onChange: (value: DeviceCameraBinding | undefined) => void }) {
  return <div className={styles.formCard}>
    <h3>Scheduled camera</h3>
    <p>Link an existing published Cosmo Band. Scheduling and playback stay in Cosmo; historical media stays in Info.</p>
    <ArchiveField htmlFor="batch-camera-enabled" label="CAMERA SOURCE">
      <select id="batch-camera-enabled" value={value ? 'cosmo' : 'none'} onChange={(event) => onChange(event.target.value === 'cosmo' ? { provider: 'cosmo', channelId: '', bandId: '', title: '', fit: 'contain' } : undefined)}>
        <option value="none">Not connected</option><option value="cosmo">Cosmo Embed</option>
      </select>
    </ArchiveField>
    {value ? <>
      <ArchiveField htmlFor="batch-camera-title" label="CAMERA TITLE"><input id="batch-camera-title" maxLength={120} value={value.title} onChange={(event) => onChange({ ...value, title: event.target.value })} /></ArchiveField>
      <div className={styles.threeColumnGrid}>
        <ArchiveField htmlFor="batch-camera-channel" label="COSMO CHANNEL ID"><input id="batch-camera-channel" value={value.channelId} onChange={(event) => onChange({ ...value, channelId: event.target.value.trim() })} /></ArchiveField>
        <ArchiveField htmlFor="batch-camera-band" label="COSMO BAND ID"><input id="batch-camera-band" value={value.bandId} onChange={(event) => onChange({ ...value, bandId: event.target.value.trim() })} /></ArchiveField>
        <ArchiveField htmlFor="batch-camera-fit" label="FRAME FIT"><select id="batch-camera-fit" value={value.fit} onChange={(event) => onChange({ ...value, fit: event.target.value === 'cover' ? 'cover' : 'contain' })}><option value="contain">Full frame</option><option value="cover">Fill and crop</option></select></ArchiveField>
      </div>
      <p>Only IDs are saved here. The trusted Embed host and allowed feeds are configured by the deployment operator. Save a draft, then publish with the normal Batch workflow.</p>
    </> : null}
  </div>
}
