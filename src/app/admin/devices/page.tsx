import { permanentRedirect } from 'next/navigation'

// Compatibility only: the legacy editor and its mutation actions are retired.
export default function RetiredDeviceAdminPage() {
  permanentRedirect('/admin/device-batches')
}
