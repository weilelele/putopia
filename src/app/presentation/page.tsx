import type { Metadata } from 'next'

import { PresentationStory } from './presentation-story'

export const metadata: Metadata = {
  title: '平行世界探索组织 — Multiverse Collective',
  description: '一场关于 Multiverse Collective、平行世界观测仪与连接使命的滚动叙事。',
}

export default function PresentationPage() {
  return <PresentationStory />
}
