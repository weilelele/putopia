import Image from 'next/image'

/**
 * Streamed immediately while the authenticated console data is loading.
 * Keeping this server-only and asset-light gives an installed PWA a useful
 * first paint instead of a blank system window during a cold launch.
 */
export default function ConsoleLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading Multiverse Console"
      className="min-h-dvh bg-[var(--color-deep)] px-6 py-8 text-[var(--color-star)]"
    >
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col">
        <p className="border-b border-[var(--bd-faint)] pb-4 text-[length:var(--fs-caption)] tracking-[0.24em] text-[var(--color-star-dim)]">
          MULTIVERSE CONSOLE
        </p>

        <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
          <Image
            src="/assets/vi-icon.png"
            alt=""
            width={128}
            height={64}
            priority
            className="h-auto w-24"
          />

          <div className="w-full border border-[var(--bd-orange)] bg-[var(--color-void)] px-6 py-5 [clip-path:polygon(0_0,calc(100%_-_10px)_0,100%_10px,100%_100%,0_100%)]">
            <p className="text-[length:var(--fs-label)] font-bold tracking-[0.2em] text-[var(--color-nucleus)]">
              OPENING CONSOLE
            </p>
            <div className="mt-4 h-1 overflow-hidden bg-[var(--color-deep)]">
              <div className="h-full w-2/3 animate-pulse bg-[var(--color-nucleus)]" />
            </div>
          </div>
        </div>

        <p className="pt-4 text-center text-[length:var(--fs-caption)] tracking-[0.14em] text-[var(--color-star-dim)]">
          SYNCING YOUR ACCESS
        </p>
      </div>
    </main>
  )
}
