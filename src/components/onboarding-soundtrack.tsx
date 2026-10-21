'use client'

import { useRef, type ReactNode } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { ArchiveButton } from '@/components/archive-button'
import { useBriefingSound } from '@/hooks/use-briefing-sound'

/** Keep one shared music player alive while the registration steps change. */
export function OnboardingSoundtrack({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  const sound = useBriefingSound(root)

  return (
    <div ref={root}>
      {children}
      <ArchiveButton
        variant="ghost"
        data-sound-toggle
        aria-label={sound.on ? 'Turn music off' : 'Turn music on'}
        aria-pressed={sound.on}
        title={sound.on ? 'Turn music off' : 'Turn music on'}
        onClick={sound.toggle}
        style={{
          position: 'fixed',
          top: 'max(12px, env(safe-area-inset-top))',
          right: 16,
          zIndex: 10000,
          width: 44,
          height: 44,
          padding: 0,
        }}
      >
        {sound.on ? <Volume2 size={20} aria-hidden /> : <VolumeX size={20} aria-hidden />}
      </ArchiveButton>
    </div>
  )
}
