'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { MissionObserve } from './mission-observe'
import './observe.css'
function Content(){const params=useSearchParams();return <MissionObserve worldId={params.get('world')??undefined}/>}
export default function Page(){return <Suspense fallback={<main className="main">Loading Observe…</main>}><Content/></Suspense>}
