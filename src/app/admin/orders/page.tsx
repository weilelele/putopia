'use client'

import { useState, useEffect, useMemo } from 'react'
import { getAllOrders, updateOrderFulfillment, createOrderManually, type AdminOrder } from '@/lib/actions/orders'

const STATUSES = ['paid', 'preparing', 'shipped', 'delivered', 'refunded', 'canceled'] as const
const STATUS_COLOR: Record<string, string> = {
  paid: '#E35205', preparing: '#E8A020', shipped: '#20D890', delivered: '#20D890',
  refunded: '#E83030', canceled: '#E83030', pending: 'rgba(245,245,245,0.4)',
}

const S = {
  card: { background: '#151B3A', border: '1px solid rgba(227,82,5,0.16)', padding: '18px', marginBottom: '14px' } as React.CSSProperties,
  input: { background: '#0F1430', border: '1px solid rgba(227,82,5,0.16)', color: '#F5F5F5', padding: '7px 9px', fontFamily: 'var(--font-mono)', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' } as React.CSSProperties,
  label: { display: 'block', color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)', letterSpacing: '0.15em', marginBottom: '4px' } as React.CSSProperties,
  btn: { background: '#C84406', border: 'none', color: '#0A0E27', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '12px', letterSpacing: '0.08em', padding: '8px 16px', cursor: 'pointer', borderRadius: '2px' } as React.CSSProperties,
  filterBtn: (on: boolean): React.CSSProperties => ({
    background: on ? '#E35205' : 'transparent', color: on ? '#0A0E27' : 'rgba(245,245,245,0.55)',
    border: '1px solid rgba(227,82,5,0.3)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
    letterSpacing: '0.1em', padding: '7px 12px', cursor: 'pointer', borderRadius: '2px',
  }),
}

type Draft = { status: string; carrier: string; tracking_number: string; tracking_url: string }

function addressLines(o: AdminOrder): string[] {
  return [
    o.recipient_name ?? '',
    o.address_line1 ?? '',
    o.address_line2 ?? '',
    [o.city, o.state, o.postal_code].filter(Boolean).join(', '),
    o.country ?? '',
    o.phone ?? '',
  ].filter((l) => l && l.trim())
}

export default function OrdersAdmin() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null)
  const [filter, setFilter] = useState<'toship' | 'all' | 'shipped'>('toship')
  const [showNew, setShowNew] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newNote, setNewNote] = useState('')
  const [creating, setCreating] = useState(false)
  const [createMsg, setCreateMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const load = async () => {
    setLoading(true)
    const all = await getAllOrders()
    setOrders(all)
    setDrafts(Object.fromEntries(all.map((o) => [o.id, {
      status: o.status,
      carrier: o.carrier ?? '',
      tracking_number: o.tracking_number ?? '',
      tracking_url: o.tracking_url ?? '',
    }])))
    setLoading(false)
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount; load() is the shared refetch reused after mutations
  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!newEmail.trim()) return
    setCreating(true); setCreateMsg(null)
    const { error, orderId } = await createOrderManually({ email: newEmail.trim(), note: newNote.trim() || undefined })
    setCreating(false)
    if (error) {
      setCreateMsg({ text: error, ok: false })
    } else {
      setCreateMsg({ text: `Order created ✓ (${orderId?.slice(0, 8)}…)`, ok: true })
      setNewEmail(''); setNewNote('')
      await load()
      setTimeout(() => { setShowNew(false); setCreateMsg(null) }, 1800)
    }
  }

  const setD = (id: string, k: keyof Draft, v: string) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [k]: v } }))

  const save = async (o: AdminOrder) => {
    const d = drafts[o.id]
    setSavingId(o.id); setMsg(null)
    const { error } = await updateOrderFulfillment(o.id, {
      status: d.status,
      carrier: d.carrier.trim() || null,
      tracking_number: d.tracking_number.trim() || null,
      tracking_url: d.tracking_url.trim() || null,
    })
    setSavingId(null)
    if (error) setMsg({ id: o.id, text: error, ok: false })
    else { setMsg({ id: o.id, text: 'Saved ✓', ok: true }); await load() }
  }

  const counts = useMemo(() => ({
    toship: orders.filter((o) => o.status === 'paid' || o.status === 'preparing').length,
    shipped: orders.filter((o) => o.status === 'shipped' || o.status === 'delivered').length,
    all: orders.length,
  }), [orders])

  const shown = orders.filter((o) =>
    filter === 'all' ? true
      : filter === 'toship' ? (o.status === 'paid' || o.status === 'preparing')
      : (o.status === 'shipped' || o.status === 'delivered'),
  )

  return (
    <div style={{ padding: '24px', fontFamily: 'var(--font-mono)', color: '#F5F5F5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
        <div>
          <div style={{ color: '#C84406', fontSize: 'var(--fs-caption)', letterSpacing: '0.25em' }}>FULFILLMENT</div>
          <h1 style={{ fontSize: '20px', margin: '6px 0 0' }}>ORDERS</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button style={S.filterBtn(filter === 'toship')} onClick={() => setFilter('toship')}>TO SHIP ({counts.toship})</button>
          <button style={S.filterBtn(filter === 'shipped')} onClick={() => setFilter('shipped')}>SHIPPED ({counts.shipped})</button>
          <button style={S.filterBtn(filter === 'all')} onClick={() => setFilter('all')}>ALL ({counts.all})</button>
          <button style={{ ...S.btn, background: showNew ? 'rgba(227,82,5,0.2)' : '#E35205', color: showNew ? '#E35205' : '#0A0E27', border: '1px solid #E35205', marginLeft: '8px' }}
            onClick={() => { setShowNew((v) => !v); setCreateMsg(null) }}>
            {showNew ? '✕ CANCEL' : '+ NEW ORDER'}
          </button>
        </div>
      </div>

      {/* Manual order creation panel */}
      {showNew && (
        <div style={{ background: '#151B3A', border: '1px solid #E35205', padding: '20px', marginBottom: '20px' }}>
          <div style={{ color: '#E35205', fontSize: 'var(--fs-caption)', letterSpacing: '0.22em', marginBottom: '14px' }}>MANUAL ORDER — confirm offline payment and provision Voyager membership</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={S.label}>BUYER EMAIL *</label>
              <input style={S.input} value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                placeholder="voyager@example.com" onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
            </div>
            <div>
              <label style={S.label}>INTERNAL NOTE (optional)</label>
              <input style={S.input} value={newNote} onChange={(e) => setNewNote(e.target.value)}
                placeholder="e.g. paid via Venmo, gift, event" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button style={{ ...S.btn, opacity: creating || !newEmail.trim() ? 0.5 : 1 }}
              disabled={creating || !newEmail.trim()} onClick={handleCreate}>
              {creating ? 'CREATING...' : 'CONFIRM PAYMENT & CREATE ORDER'}
            </button>
            {createMsg && (
              <span style={{ fontSize: '12px', color: createMsg.ok ? '#20D890' : '#E83030' }}>{createMsg.text}</span>
            )}
          </div>
          <div style={{ marginTop: '10px', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)', lineHeight: 1.6 }}>
            Creates a paid order → auto-upgrades the account to Voyager + joins current batch.<br />
            If no account exists for this email, an invitation will be sent automatically.
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'rgba(245,245,245,0.35)', padding: '40px 0', textAlign: 'center', letterSpacing: '0.15em' }}>LOADING ORDERS...</div>
      ) : shown.length === 0 ? (
        <div style={{ color: 'rgba(245,245,245,0.35)', padding: '40px 0', textAlign: 'center', letterSpacing: '0.1em' }}>No orders in this view.</div>
      ) : (
        shown.map((o) => {
          const d = drafts[o.id]
          if (!d) return null
          return (
            <div key={o.id} style={S.card}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                <div style={{ fontSize: '14px' }}>
                  <span style={{ color: '#F5F5F5' }}>{o.email ?? '—'}</span>
                  {o.amount != null && <span style={{ color: 'rgba(245,245,245,0.45)' }}> · ${(o.amount / 100).toFixed(2)}</span>}
                  {o.batch_label && <span style={{ color: 'rgba(245,245,245,0.45)' }}> · {o.batch_label}</span>}
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', textTransform: 'uppercase', color: STATUS_COLOR[o.status] ?? '#F5F5F5' }}>● {o.status}</span>
                  <span style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)' }}>{o.created_at.slice(0, 10)}</span>
                </div>
              </div>

              {/* Address + fulfillment */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) minmax(280px,2fr)', gap: '20px' }}>
                <div>
                  <div style={S.label}>SHIP TO</div>
                  {addressLines(o).length ? (
                    <div style={{ fontSize: '13px', color: 'rgba(245,245,245,0.7)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                      {addressLines(o).join('\n')}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'rgba(245,245,245,0.35)' }}>No address on file (mock / pending).</div>
                  )}
                </div>

                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={S.label}>STATUS</label>
                      <select style={S.input} value={d.status} onChange={(e) => setD(o.id, 'status', e.target.value)}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>CARRIER</label>
                      <input style={S.input} value={d.carrier} onChange={(e) => setD(o.id, 'carrier', e.target.value)} placeholder="USPS / UPS / FedEx" />
                    </div>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={S.label}>TRACKING NUMBER</label>
                    <input style={S.input} value={d.tracking_number} onChange={(e) => setD(o.id, 'tracking_number', e.target.value)} placeholder="e.g. 9400 1000 0000 0000 0000 00" />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={S.label}>TRACKING URL (optional)</label>
                    <input style={S.input} value={d.tracking_url} onChange={(e) => setD(o.id, 'tracking_url', e.target.value)} placeholder="https://tools.usps.com/go/TrackConfirmAction?tLabels=..." />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
                    {msg?.id === o.id && (
                      <span style={{ fontSize: '12px', color: msg.ok ? '#20D890' : '#E83030' }}>{msg.text}</span>
                    )}
                    <button style={{ ...S.btn, opacity: savingId === o.id ? 0.5 : 1 }} disabled={savingId === o.id} onClick={() => save(o)}>
                      {savingId === o.id ? 'SAVING...' : 'SAVE'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
