import type { MetadataRoute } from 'next'

export const PWA_MANIFEST: MetadataRoute.Manifest = {
  id: '/',
  name: 'Multiverse Collective',
  short_name: 'Multiverse',
  description: 'Access the Multiverse Collective Console.',
  start_url: '/welcome?source=pwa',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait-primary',
  background_color: '#080C20',
  theme_color: '#080C20',
  icons: [
    {
      src: '/icons/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/icon-512-maskable.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
}

export default function manifest(): MetadataRoute.Manifest {
  return PWA_MANIFEST
}
