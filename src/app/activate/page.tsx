import { redirect } from 'next/navigation'

// The old "await manual activation" and "/devices/claim" models are both retired.
// Becoming a Voyager now goes through the Initial Voyager Pack. Keep this path
// alive so any old links still resolve.
export default function ActivatePage() {
  redirect('/voyager-pack')
}
