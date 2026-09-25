// Device introduction display configuration. Keep all three device screens visible.
// Replace/reorder these entries to change the slideshow; use one entry for a still.
export const CONSOLE_HERO = {
  intervalMs: 6000,
  images: [
    { src: '/assets/kyoto-one-20260910/01-warehouse-hero.png', width: 1536, height: 1024, alt: 'Multiverse Console on a Kyoto workbench, with a starry landscape on its central screen and both side displays illuminated' },
    { src: '/assets/q1-20260910/01-robot-library.png', width: 1448, height: 1086, alt: 'Multiverse Console with a robot in an overgrown library on its central screen and both side displays illuminated' },
    { src: '/assets/q1-20260910/02-shepherd.png', width: 1448, height: 1086, alt: 'Multiverse Console with a shepherd reading outdoors on its central screen and both side displays illuminated' },
  ],
} satisfies { intervalMs: number; images: [ConsoleHeroImage, ...ConsoleHeroImage[]] }

type ConsoleHeroImage = { src: string; width: number; height: number; alt: string }
