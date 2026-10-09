import { redirect } from 'next/navigation'

/** Historical path and its query/hash links now enter the shared membership page. */
export default function VoyagerPathPage() {
  redirect('/voyager-initiation')
}
