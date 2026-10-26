import Image from 'next/image'

/** Atlas cells preserve one camera while character poses change. */
export function MissionEventFrame({ worldId, eventId, title }: { worldId: string; eventId: string; title: string }) {
  const cells: Record<string, string> = { noticed: '0% 0%', book: '100% 0%', retreat: '0% 100%', quiet: '100% 100%' }
  const position = cells[eventId]
  const robot = worldId === 'robot-library'
  return position ? <div role="img" aria-label={`${title}. Generated fixed-camera event still.`} style={{ width: '100%', height: '100%', minHeight: 'inherit', aspectRatio: '16 / 9', backgroundImage: `url(/assets/mission-events/${robot ? 'robot-library' : 'shepherdess'}-atlas.png)`, backgroundSize: '200% 200%', backgroundPosition: position }} /> : <Image src={robot ? '/assets/console-intro/library.webp' : '/assets/console-intro/meadow.webp'} alt={`${title}. Fixed-camera reference still.`} width={1200} height={675} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
}
