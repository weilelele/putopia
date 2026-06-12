import { PACK_HTML } from './packHtml'

// Public product page — accessible to all users including guests.
// Authentication is only required at checkout (/api/checkout), which enforces
// login, experiment-group gating (task_gated users must finish their assessment
// first), and Stripe session creation.
export default function VoyagerPackPage() {
  return (
    <iframe
      title="Initial Voyager Pack"
      srcDoc={PACK_HTML}
      scrolling="yes"
      style={{
        display: 'block',
        width: '100%',
        height: '100vh',
        border: 0,
        background: '#0A0E27',
      }}
    />
  )
}
