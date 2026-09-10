'use client'
import { ArchiveButton } from '@/components/archive-button'


export default function DeviceLibraryError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-20" role="alert">
      <h1 className="text-2xl">DEVICE LIBRARY UNAVAILABLE</h1>
      <p className="mt-4">We could not load the device registry. Please try again.</p>
      <ArchiveButton variant="secondary" type="button" className="mt-6 border px-4 py-3" onClick={reset}>TRY AGAIN</ArchiveButton>
    </main>
  )
}
