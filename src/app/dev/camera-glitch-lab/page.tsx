import { notFound } from 'next/navigation'
import { CameraGlitchLab } from './camera-glitch-lab'
import { parseCameraOrigin, type DeviceCameraSource } from '@/lib/device-camera'

export const dynamic = 'force-dynamic'

export default function CameraGlitchLabPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  const embedOrigin = parseCameraOrigin(process.env.COSMO_EMBED_ORIGIN, true)
  if (!embedOrigin) notFound()
  const source: DeviceCameraSource = {
    embedOrigin,
    demo: true,
    binding: {
      provider: 'cosmo',
      channelId: '6a0419e515e35a5f46396a85',
      bandId: '6a0419f615e35a5f46396a8f',
      title: 'Cosmo camera glitch test',
      fit: 'contain',
    },
  }
  return <CameraGlitchLab source={source} />
}
