import { createClient, createAdminClient } from '@/lib/supabase/server'
import { PACK_HTML } from './packHtml'

export const dynamic = 'force-dynamic'

// ─── Global sales gate ────────────────────────────────────────────────────────
// Set to true when you're ready to open purchases.
// Keep in sync with api/checkout/route.ts and console/page.tsx.
const SALES_OPEN = false

// The product page itself is NEVER blocked by an overlay — the only thing that
// changes between user states is the bottom CTA button. Four states:
//   buy     — orange, clickable → /api/checkout (Stripe)
//   tasks   — orange, clickable → /dashboard-demo (finish prerequisites first)
//   closed  — greyed, click shows a centered "launch pending" dialog
//   voyager — greyed green, click shows a centered "already active" dialog
type CtaState = 'buy' | 'tasks' | 'closed' | 'voyager'

// Copy for the two states that pop a centered dialog on click.
const DLG_COPY: Record<'closed' | 'voyager', {
  eyebrow: string; title: string; body: string; accent: string
}> = {
  closed: {
    eyebrow: '◈ LAUNCH PENDING ◈',
    title:   'The Voyager Pack is not yet available.',
    body:    "We're preparing the first batch. Registered Applicants will be notified when the pack goes live.",
    accent:  '255,107,53',
  },
  voyager: {
    eyebrow: '◈ MEMBERSHIP ACTIVE ◈',
    title:   "You're already a Voyager.",
    body:    'Your Initial Voyager Pack is on its way — no need to purchase again.',
    accent:  '32,216,144',
  },
}

// Produce the iframe document for a given CTA state by patching the base pack HTML.
function buildPackHtml(state: CtaState): string {
  if (state === 'buy') return PACK_HTML // default markup — orange Stripe button

  if (state === 'tasks') {
    return PACK_HTML
      .replace('href="/api/checkout"', 'href="/dashboard-demo"')
      .replace("cta:   'Activate Voyager Status'", "cta:   'Complete Tasks to Purchase'")
      .replace("price: '$12'", "price: ''")
  }

  // 'closed' | 'voyager' — greyed button + centered dialog on click
  const copy       = DLG_COPY[state]
  const btnText    = state === 'voyager' ? '✓ Already a Voyager' : 'Not Available to Purchase'
  const lockClass  = state === 'voyager' ? 'ctabtn--locked ctabtn--ok' : 'ctabtn--locked'

  const css = `
  .ctabtn--locked{ background:rgba(245,245,245,0.13)!important; color:rgba(245,245,245,0.5)!important; box-shadow:none!important; cursor:pointer!important; }
  .ctabtn--ok{ color:rgba(32,216,144,0.85)!important; }
  .ctabtn--locked .p{ display:none!important; }
  .pkdlg-scrim{ position:fixed; inset:0; background:rgba(6,10,26,0.8); -webkit-backdrop-filter:blur(4px); backdrop-filter:blur(4px); display:none; align-items:center; justify-content:center; padding:24px; z-index:9999; }
  .pkdlg-scrim.show{ display:flex; }
  .pkdlg{ max-width:360px; width:100%; background:#0F1430; border:1px solid rgba(${copy.accent},0.32); padding:24px 26px 20px; text-align:center; box-shadow:0 0 50px rgba(6,10,26,0.7); }
  .pkdlg .eb{ font-size:8px; letter-spacing:0.30em; color:rgba(${copy.accent},0.65); margin-bottom:12px; }
  .pkdlg h4{ margin:0 0 10px; font-size:15px; font-weight:700; color:#F5F5F5; letter-spacing:0.04em; line-height:1.35; }
  .pkdlg p{ margin:0 0 18px; font-size:11px; color:rgba(245,245,245,0.45); line-height:1.7; }
  .pkdlg button{ background:rgba(${copy.accent},0.1); color:rgb(${copy.accent}); border:1px solid rgba(${copy.accent},0.4); padding:10px 30px; font-family:var(--mono); font-weight:700; font-size:11px; letter-spacing:0.16em; cursor:pointer; }`

  const modal = `
  <div class="pkdlg-scrim" id="__pkdlg" onclick="if(event.target===this)this.classList.remove('show')">
    <div class="pkdlg">
      <div class="eb">${copy.eyebrow}</div>
      <h4>${copy.title}</h4>
      <p>${copy.body}</p>
      <button type="button" onclick="document.getElementById('__pkdlg').classList.remove('show')">GOT IT</button>
    </div>
  </div>
  <script>function __packDlg(){document.getElementById('__pkdlg').classList.add('show');}</script>`

  return PACK_HTML
    .replace("cta:   'Activate Voyager Status'", `cta:   '${btnText}'`)
    .replace("price: '$12'", "price: ''")
    .replace(
      '<a class="ctabtn" href="/api/checkout">',
      `<a class="ctabtn ${lockClass}" href="#" onclick="event.preventDefault();__packDlg()">`,
    )
    .replace('</style>', `${css}\n</style>`)
    .replace('</body>', `${modal}\n</body>`)
}

// Public product page — accessible to all users including guests. The page is
// never overlaid; only the CTA button reflects the visitor's state.
export default async function VoyagerPackPage() {
  let alreadyVoyager  = false
  let tasksIncomplete = false

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('voyager_profiles')
        .select('role, experiment_group, task_quiz_at')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'voyager' || profile?.role === 'architect') {
        alreadyVoyager = true
      } else if (SALES_OPEN && profile?.experiment_group === 'task_gated') {
        // Only evaluate the task gate when sales are actually open.
        const quiz = !!profile.task_quiz_at
        const admin = createAdminClient()
        const { count: sightingCount } = await admin
          .from('worlds')
          .select('id', { count: 'exact', head: true })
          .eq('submitted_by', user.id)
        const sighting = (sightingCount ?? 0) > 0
        if (!(quiz && sighting)) tasksIncomplete = true
      }
    }
  } catch {
    // Non-critical — fall through and show the default (buy) button.
  }

  // Resolve the single CTA state (priority: voyager → closed → tasks → buy).
  let state: CtaState = 'buy'
  if (alreadyVoyager)        state = 'voyager'
  else if (!SALES_OPEN)      state = 'closed'
  else if (tasksIncomplete)  state = 'tasks'

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <iframe
        title="Initial Voyager Pack"
        srcDoc={buildPackHtml(state)}
        scrolling="yes"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          border: 0,
          background: '#0A0E27',
        }}
      />
    </div>
  )
}
