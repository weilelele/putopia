import { permanentRedirect } from 'next/navigation'

// Historical device IDs have no reliable one-to-one mapping to a Batch.
export default function RetiredDevicePage() {
  permanentRedirect('/devices')
}
