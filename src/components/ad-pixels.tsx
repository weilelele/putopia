'use client'

import { useSyncExternalStore } from 'react'
import Script from 'next/script'
import { isIOSNativeApp } from '@/lib/app-platform'
import { REDDIT_PIXEL_ID } from '@/lib/reddit-ads-config'

const subscribe = () => () => {}
// Server and first client render say "no pixels"; browsers then switch to true.
const getSnapshot = () => !isIOSNativeApp(navigator.userAgent)
const getServerSnapshot = () => false

/**
 * Advertising pixels (Meta, X, Reddit) for the website. They are never loaded
 * inside the iOS app: the App Store listing declares no tracking, and with no
 * pixel globals present every `fbq` / `twq` / `rdt` caller already no-ops.
 */
export function AdPixels() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  if (!enabled) return null
  return (
    <>
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window,document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','993248870105581');
          fbq('track','PageView');
        `}</Script>
        <Script id="x-pixel" strategy="afterInteractive">{`
          !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
          },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
          a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
          twq('config','rd22u');
        `}</Script>
        <Script id="reddit-pixel" strategy="afterInteractive">{`
          !function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js?pixel_id=${REDDIT_PIXEL_ID}",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);rdt('init','${REDDIT_PIXEL_ID}');rdt('track', 'PageVisit');
        `}</Script>
    </>
  )
}
