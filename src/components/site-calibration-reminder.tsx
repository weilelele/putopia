'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { loadCalibrationReminder } from '@/lib/actions/calibration-reminder'
import { allowsCalibrationReminder, type CalibrationReminderResult } from '@/lib/post-payment-calibration'
import { CALIBRATION_CHECK_EVENT, CALIBRATION_COMPLETED_KEY, CALIBRATION_COMPLETED_EVENT } from '@/lib/calibration-reminder-client'
import { createClient } from '@/lib/supabase/client'

const PostPaymentCalibration = dynamic(() => import('@/app/voyager-initiation/post-payment-calibration').then(module => module.PostPaymentCalibration))
type Invitation = Extract<CalibrationReminderResult, { status: 'due' }>

/** Check on site entry/return, never with a 24-hour timer while the user is browsing. */
export function SiteCalibrationReminder({ environment = 'unknown' }: { environment?: string }) {
  const allowed = allowsCalibrationReminder(usePathname())
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [previousAllowed, setPreviousAllowed] = useState(allowed)
  if (previousAllowed !== allowed) {
    setPreviousAllowed(allowed)
    setInvitation(null)
  }

  useEffect(() => {
    if (!allowed) return
    let active = true
    let pending = false
    let rerun = false
    let identityRevision = 0
    let authUserId: string | null | undefined
    let queued: Invitation | null = null
    function present() {
      if (queued && !document.querySelector('dialog[open]')) {
        setInvitation(queued)
        queued = null
      }
    }
    async function refresh() {
      if (!active || document.visibilityState !== 'visible') return
      if (pending) { rerun = true; return }
      pending = true
      const revision = identityRevision
      try {
        const result = await loadCalibrationReminder()
        if (!active || revision !== identityRevision) return
        if (result.status === 'due') { queued = result; present() }
        else if (result.status === 'completed' || result.status === 'ineligible') { queued = null; setInvitation(null) }
        // A duplicate request seeing cooldown must not hide the invitation we just claimed.
      } catch { /* A reminder outage must not interrupt the website. */ }
      finally {
        pending = false
        if (rerun) { rerun = false; void refresh() }
      }
    }
    const onReturn = () => { void refresh() }
    const onStorage = (event: StorageEvent) => { if (event.key === CALIBRATION_COMPLETED_KEY) void refresh() }
    const onCompletedHere = () => {
      queued = null
      // Keep this tab's completion screen visible until Done; cancel any waiting invitation.
      if (!document.querySelector('dialog[open]')) void refresh()
    }
    const observer = new MutationObserver(present)
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] })
    const auth = createClient().auth
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      const id = session?.user.id ?? null
      if (event === 'INITIAL_SESSION') { authUserId = id; return }
      if (id === authUserId) return
      authUserId = id
      identityRevision++
      queued = null
      setInvitation(null)
      void refresh()
    })
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    window.addEventListener('pageshow', onReturn)
    window.addEventListener(CALIBRATION_CHECK_EVENT, onReturn)
    window.addEventListener('storage', onStorage)
    window.addEventListener(CALIBRATION_COMPLETED_EVENT, onCompletedHere)
    // Resolve the local identity before the first claim so initial auth events
    // cannot invalidate a successfully claimed invitation as an account change.
    void auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      authUserId = session?.user.id ?? null
      void refresh()
    }).catch(() => {})
    return () => {
      active = false
      observer.disconnect()
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
      window.removeEventListener('pageshow', onReturn)
      window.removeEventListener(CALIBRATION_CHECK_EVENT, onReturn)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(CALIBRATION_COMPLETED_EVENT, onCompletedHere)
    }
  }, [allowed])

  if (!allowed || !invitation) return null
  return <PostPaymentCalibration key={`${invitation.snapshot.userId}:${invitation.promptedAt}`} snapshot={invitation.snapshot} autoInvite environment={environment} />
}
