'use client'

import { createContext, useContext, useRef, type ReactNode } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { ArchiveButton } from '@/components/archive-button'
import { useBriefingSound } from '@/hooks/use-briefing-sound'

const SoundtrackContext = createContext<ReturnType<typeof useBriefingSound> | null>(null)

/** Keep one shared music player alive while the registration steps change. */
export function OnboardingSoundtrack({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  const sound = useBriefingSound(root)

  return (
    <SoundtrackContext.Provider value={sound}>
      <div ref={root}>{children}</div>
    </SoundtrackContext.Provider>
  )
}

/** A quiet control in the content flow, below the video rather than over it. */
export function OnboardingSoundControl() {
  const sound = useContext(SoundtrackContext)
  if (!sound) return null

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
      <ArchiveButton
        variant="ghost"
        data-sound-toggle
        aria-label={sound.on ? 'Turn music off' : 'Turn music on'}
        aria-pressed={sound.on}
        title={sound.on ? 'Turn music off' : 'Turn music on'}
        onClick={sound.toggle}
        style={{
          width: 44,
          height: 44,
          padding: 0,
          color: 'var(--color-star-dim)',
        }}
      >
        {sound.on ? <Volume2 size={18} strokeWidth={1.5} aria-hidden /> : <VolumeX size={18} strokeWidth={1.5} aria-hidden />}
      </ArchiveButton>
    </div>
  )
}
