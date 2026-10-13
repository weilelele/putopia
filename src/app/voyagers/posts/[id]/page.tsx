import { VoyagerPostPage } from '../../voyager-post-page'
export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <VoyagerPostPage id={id} />
}
