import { createClient, createAdminClient } from '@/lib/supabase/server'
import { PACK_HTML } from './packHtml'

export const dynamic = 'force-dynamic'

// Public product page — accessible to all users including guests.
// Auth + gating is enforced at /api/checkout.
// For task_gated users with incomplete tasks we overlay a lock banner so they
// know they need to finish their assessment before they can purchase.
export default async function VoyagerPackPage() {
  let showLockBanner = false

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('voyager_profiles')
        .select('experiment_group, task_quiz_at, task_intel_at')
        .eq('id', user.id)
        .single()

      if (profile?.experiment_group === 'task_gated') {
        const intel = !!profile.task_intel_at
        const quiz  = !!profile.task_quiz_at

        const admin = createAdminClient()
        const { count: sightingCount } = await admin
          .from('worlds')
          .select('id', { count: 'exact', head: true })
          .eq('submitted_by', user.id)
        const sighting = (sightingCount ?? 0) > 0

        const { data: voteRows } = await admin
          .from('vote_responses')
          .select('vote_id')
          .eq('user_id', user.id)
        const votes =
          new Set(((voteRows ?? []) as { vote_id: string }[]).map((r) => r.vote_id)).size >= 2

        if (!(intel && quiz && sighting && votes)) {
          showLockBanner = true
        }
      }
    }
  } catch {
    // Non-critical — silently fall through and show the pack normally
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <iframe
        title="Initial Voyager Pack"
        srcDoc={PACK_HTML}
        scrolling="yes"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          border: 0,
          background: '#0A0E27',
        }}
      />

      {showLockBanner && (
        /* Overlay that covers the native checkout CTA for task_gated users */
        <div style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 0,
          background: 'rgba(6,10,26,0.97)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderTop: '1px solid rgba(232,160,32,0.35)',
          padding: '22px 28px 28px',
          zIndex: 10,
        }}>
          <div style={{
            maxWidth: 480,
            margin: '0 auto',
            textAlign: 'center',
            fontFamily: "'Space Mono', ui-monospace, monospace",
          }}>
            <div style={{
              fontSize: 8,
              letterSpacing: '0.30em',
              color: 'rgba(232,160,32,0.6)',
              marginBottom: 10,
            }}>
              ◈ PACK LOCKED ◈
            </div>
            <div style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#F5F5F5',
              letterSpacing: '0.06em',
              marginBottom: 10,
              lineHeight: 1.3,
            }}>
              Complete Your Field Assessment to Purchase
            </div>
            <div style={{
              fontSize: 11,
              color: 'rgba(245,245,245,0.42)',
              lineHeight: 1.75,
              marginBottom: 20,
            }}>
              The Initial Voyager Pack unlocks once you finish the
              Collective&apos;s evaluation tasks. Head to the console to
              check your progress.
            </div>
            <a
              href="/console"
              style={{
                display: 'inline-block',
                background: 'rgba(232,160,32,0.08)',
                color: '#E8A020',
                fontFamily: "'Space Mono', ui-monospace, monospace",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textDecoration: 'none',
                padding: '11px 32px',
                border: '1px solid rgba(232,160,32,0.45)',
              }}
            >
              VIEW MY PROGRESS →
            </a>
            <div style={{
              marginTop: 12,
              fontSize: 9,
              color: 'rgba(245,245,245,0.18)',
              letterSpacing: '0.08em',
            }}>
              Pack ($12) unlocks automatically on completion
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
