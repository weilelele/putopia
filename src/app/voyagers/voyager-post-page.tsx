'use client'
import { useAuth } from '@/lib/auth-context'
import { VoyagerFeed } from './voyager-feed'
export function VoyagerPostPage({ id }: { id: string }) {
  const { user, loading } = useAuth()
  return <VoyagerFeed key={`${id}:${user.id ?? 'guest'}:${user.role}:${loading}`} postId={id} />
}
