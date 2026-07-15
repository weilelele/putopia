import { createClient } from '@/lib/supabase/server'
import { PACK_HTML } from './packHtml'
import { PackViewTracker } from './pack-view-tracker'

export const dynamic = 'force-dynamic'

// ─── Global sales gate ────────────────────────────────────────────────────────
// Set to true when you're ready to open purchases.
// Keep in sync with api/checkout/route.ts and console/page.tsx.
const SALES_OPEN = true

// The product page itself is NEVER blocked by an overlay — the only thing that
// changes between user states is the bottom CTA button. Four states:
//   buy     — orange, clickable → /api/checkout (Stripe)
//   tasks   — orange, clickable → /voyager-path (finish prerequisites first)
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
      .replace('href="/api/checkout"', 'href="/voyager-path"')
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
  .pkdlg .eb{ font-size: var(--fs-caption); letter-spacing:0.30em; color:rgba(${copy.accent},0.65); margin-bottom:12px; }
  .pkdlg h4{ margin:0 0 10px; font-size:15px; font-weight:700; color:#F5F5F5; letter-spacing:0.04em; line-height:1.35; }
  .pkdlg p{ margin:0 0 18px; font-size: var(--fs-caption); color:rgba(245,245,245,0.45); line-height:1.7; }
  .pkdlg button{ background:rgba(${copy.accent},0.1); color:rgb(${copy.accent}); border:1px solid rgba(${copy.accent},0.4); padding:10px 30px; font-family:var(--mono); font-weight:700; font-size: var(--fs-caption); letter-spacing:0.16em; cursor:pointer; }`

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
  let group: string   = 'none'   // experiment group for analytics

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('voyager_profiles')
        .select('role, experiment_group, task_quiz_at')
        .eq('id', user.id)
        .single()

      if (profile?.experiment_group) group = profile.experiment_group

      // The pack is now a peer task: BOTH groups can buy directly, no task gate.
      // (Sighting/quiz are independent steps on /voyager-path, not prerequisites.)
      if (profile?.role === 'voyager' || profile?.role === 'architect') {
        alreadyVoyager = true
      }
    }
  } catch {
    // Non-critical — fall through and show the default (buy) button.
  }

  // Resolve the single CTA state (priority: voyager → closed → buy).
  let state: CtaState = 'buy'
  if (alreadyVoyager)        state = 'voyager'
  else if (!SALES_OPEN)      state = 'closed'

  return (
    <>
      {/*
        iOS height fix — DO NOT revert to a bare `height: 100vh`.
        On iOS Safari/Chrome `100vh` is the *large* viewport (toolbars hidden), so
        at load the iframe runs taller than the visible area and the bottom CTA
        ends up behind the browser toolbar. The parent `.app-shell` clips overflow
        (height:100vh; overflow:hidden) and there is no outer scroll, so the button
        becomes unreachable. Sizing the host to the dynamic/visible viewport keeps
        the iframe — and its bottom Activate button — fully on screen.
        Stacked fallbacks: ancient → 100vh, iOS14 → -webkit-fill-available,
        modern → 100dvh (the one that actually fixes it).
      */}
      <style>{`
        .pack-host {
          width: 100%;
          height: 100vh;
          height: -webkit-fill-available;
          height: 100dvh;
          background: #0A0E27;
          overflow: hidden;
        }
        .pack-host iframe { display: block; width: 100%; height: 100%; border: 0; }
      `}</style>
      <div className="pack-host">
        <PackViewTracker group={group} state={state} />
        <iframe
          title="Initial Voyager Pack"
          srcDoc={buildPackHtml(state)}
          scrolling="yes"
          style={{ background: '#0A0E27' }}
        />
      </div>
    </>
  )
}
