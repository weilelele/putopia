import { createClient, createAdminClient } from '@/lib/supabase/server'
import { PACK_HTML } from './packHtml'

export const dynamic = 'force-dynamic'

// Public product page — accessible to all users including guests.
// Auth + gating is enforced at /api/checkout.
// For task_gated users with incomplete tasks we overlay a lock banner so they
// know they need to finish their assessment before they can purchase.
export default async function VoyagerPackPage() {
  let showLockBanner = false
  let alreadyVoyager = false

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('voyager_profiles')
        .select('role, experiment_group, task_quiz_at')
        .eq('id', user.id)
        .single()

      // Already paid in / promoted → no need to buy again.
      if (profile?.role === 'voyager' || profile?.role === 'architect') {
        alreadyVoyager = true
      } else if (profile?.experiment_group === 'task_gated') {
        const quiz = !!profile.task_quiz_at

        const admin = createAdminClient()
        const { count: sightingCount } = await admin
          .from('worlds')
          .select('id', { count: 'exact', head: true })
          .eq('submitted_by', user.id)
        const sighting = (sightingCount ?? 0) > 0

        // Promotion gate: a sighting + the assessment quiz only.
        if (!(quiz && sighting)) {
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

      {alreadyVoyager && (
        /* User is already a Voyager — cover the checkout CTA so they can't re-pay */
        <div style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 0,
          background: 'rgba(6,10,26,0.97)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderTop: '1px solid rgba(32,216,144,0.35)',
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
              color: 'rgba(32,216,144,0.7)',
              marginBottom: 10,
            }}>
              ◈ MEMBERSHIP ACTIVE ◈
            </div>
            <div style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#F5F5F5',
              letterSpacing: '0.06em',
              marginBottom: 10,
              lineHeight: 1.3,
            }}>
              You&apos;ve already got your badge.
            </div>
            <div style={{
              fontSize: 11,
              color: 'rgba(245,245,245,0.42)',
              lineHeight: 1.75,
              marginBottom: 20,
            }}>
              You&apos;re already a Voyager — your Initial Voyager Pack is on its
              way. No need to purchase again.
            </div>
            <div
              aria-disabled
              style={{
                display: 'inline-block',
                background: 'rgba(245,245,245,0.04)',
                color: 'rgba(32,216,144,0.75)',
                fontFamily: "'Space Mono', ui-monospace, monospace",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.18em',
                padding: '11px 32px',
                border: '1px solid rgba(32,216,144,0.45)',
                cursor: 'default',
              }}
            >
              ✓ VOYAGER — ACTIVE
            </div>
            <div style={{ marginTop: 14 }}>
              <a
                href="/console"
                style={{
                  fontSize: 10,
                  color: 'rgba(245,245,245,0.4)',
                  letterSpacing: '0.12em',
                  textDecoration: 'none',
                }}
              >
                ← BACK TO CONSOLE
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
