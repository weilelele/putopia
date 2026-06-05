import { redirect } from 'next/navigation'

// The old "await manual activation" model is retired. Becoming a Voyager now
// means claiming the first parts pack. Keep this path alive for old links.
export default function ActivatePage() {
  redirect('/devices/claim')
}
