import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import './visual-refresh.css'
import './standalone.css'

const courier = localFont({src:[{path:'./fonts/courier-prime-regular-latin.woff2',weight:'400'},{path:'./fonts/courier-prime-bold-latin.woff2',weight:'700'}],variable:'--font-mono',display:'swap'})
export const metadata: Metadata = {title:'Multiverse Mission Lab',description:'Explore the Console simulator and follow automatic world discoveries.'}
export default function Layout({children}:{children:React.ReactNode}) {
  return <html lang="en" className={courier.variable}><body><div className="app-shell">{children}</div></body></html>
}
