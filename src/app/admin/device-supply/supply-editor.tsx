'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveInput } from '@/components/archive-input'
import { fulfillBoundConsole, type getDeviceSupplyAdmin } from '@/lib/actions/device-supply'

type Data = Awaited<ReturnType<typeof getDeviceSupplyAdmin>>
export function DeviceSupplyEditor({ data }: { data: Data }) {
  return <main className="p-4 space-y-6">
    <h1>S26 device supply</h1>
    <p>Members choose an available device batch when claiming. Each confirmed claim is permanent and uses one Console entitlement.</p>
    <ul>{data.options.map(b => <li className="py-3" key={b.slug}>{b.name} · {b.publication_status}<br />Capacity {b.listing_quantity} · Claimed {b.claimed_quantity} · Reserved {b.reserved_quantity} · Available Units {b.availableUnits}</li>)}</ul>
    <h2>Console / shipment 3 fulfillment</h2>
    <p>Each Console is the third Initiation shipment. Update it here once; the personal package timeline uses the same record.</p>
    {data.claims.map(claim=><ConsoleFulfillment key={`${claim.id}:${claim.status}`} claim={claim} />)}
    {!data.claims.length ? <p>No Console claims.</p> : null}
  </main>
}
function ConsoleFulfillment({ claim }: { claim: Data['claims'][number] }) {
  const router = useRouter()
  const [unitCode,setUnitCode] = useState('')
  const [trackingUrl,setTrackingUrl] = useState(claim.tracking_url ?? '')
  const [message,setMessage] = useState('')
  const [busy,setBusy] = useState(false)
  const next = claim.status==='paid' ? 'preparing' : claim.status==='preparing' ? 'shipped' : claim.status==='shipped' ? 'delivered' : null
  return <form className="space-y-3 py-4" onSubmit={async e=> {e.preventDefault();if (!next || busy) return;setBusy(true);try {const r=await fulfillBoundConsole({orderId:claim.id,unitCode,status:next,trackingUrl});setMessage(r.error ?? 'Shipment 3 and Console updated together.');if (!r.error) router.refresh()} catch {setMessage('Result unknown. Reload before retrying.')} finally {setBusy(false)} }}>
    <h3>{claim.unitCode ?? 'Missing Unit binding'}</h3><p>{claim.device_batch_slug} · {claim.status} · {claim.id}</p>
    {next ? <><label className="block">Verify exact Unit code<ArchiveInput required value={unitCode} onChange={e=>setUnitCode(e.target.value)} disabled={busy} /></label><label className="block">Tracking URL<ArchiveInput type="url" value={trackingUrl} onChange={e=>setTrackingUrl(e.target.value)} required={next!=='preparing'} disabled={busy || claim.status==='shipped'} /></label><ArchiveButton variant="primary" disabled={busy || !claim.unitCode || unitCode!==claim.unitCode}>{busy ? 'UPDATING…' : `MARK ${next.toUpperCase()}`}</ArchiveButton></> : null}<p role="status">{message}</p>
  </form>
}
