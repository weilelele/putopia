import { getVoyagerSubmission } from '@/lib/actions/voyager-feed'
export async function GET(_request: Request, {params}: {params: Promise<{id:string}>}) {
  try { return Response.json(await getVoyagerSubmission((await params).id), {headers:{'Cache-Control':'private, no-store'}}) }
  catch { return Response.json({error:'Unable to verify the result.'}, {status:503,headers:{'Cache-Control':'private, no-store'}}) }
}
