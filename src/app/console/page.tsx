import { getDashboard } from '@/lib/actions/dashboard'
import ConsoleClient from './console-client'
export const dynamic = 'force-dynamic'
export default async function ConsolePage() { return <ConsoleClient initial={await getDashboard()} /> }
