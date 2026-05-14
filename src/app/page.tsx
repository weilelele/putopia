'use client'

import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="landing-root">
      {/* CLASSIFIED stamp */}
      <div className="classified-stamp">
        <div className="l1">CLASSIFIED</div>
        <div className="l2"><span className="stamp-wing" /> CLEARANCE LEVEL: VOYAGER <span className="stamp-wing" /></div>
        <div className="l3"><span className="stamp-wing" /> ACCESS GRANTED <span className="stamp-wing" /></div>
      </div>

      {/* Background layers */}
      <div className="stars-bg" />
      <div className="nebula-bg" />

      <section className="hero">
        <div className="eyebrow">WELCOME,</div>
        <h1 className="hero-title">
          <span className="sparkle sparkle-l">✦</span>
          VOYAGER
          <span className="sparkle sparkle-r">✦</span>
        </h1>
        <p className="hero-subtitle">
          YOU HAVE BEEN SELECTED TO EXPLORE<br />
          THE MYSTERIES OF PARALLEL WORLDS.
        </p>

        <div className="deco-diamond"><span /></div>

        <div className="device-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/device.png" alt="Multiverse Console" />
        </div>

        <div className="cta-row">
          <Link href="#apply" className="cta">
            <div className="cta-bg" />
            <div className="cta-frame" />
            <div className="cta-icon-slot">
              <div className="cta-icon-circle">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 3 L13.2 10.8 L21 12 L13.2 13.2 L12 21 L10.8 13.2 L3 12 L10.8 10.8 Z" stroke="currentColor" strokeWidth="1.4" fill="rgba(255,112,32,0.15)" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <div className="cta-divider" />
            <div className="cta-label">BECOME A VOYAGER</div>
          </Link>

          <Link href="/login" className="cta teal">
            <div className="cta-bg" />
            <div className="cta-frame" />
            <div className="cta-icon-slot">
              <div className="cta-icon-circle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <rect x="5" y="11" width="14" height="10" rx="1" />
                  <path d="M8 11 V8 a4 4 0 0 1 8 0 V11" strokeLinecap="round" />
                  <circle cx="12" cy="16" r="1.3" fill="currentColor" />
                </svg>
              </div>
            </div>
            <div className="cta-divider" />
            <div className="cta-label">INTERNAL LOGIN</div>
          </Link>
        </div>

        <div className="footer-tag">
          PUTOPIA COLLECTIVE <span className="dot">◆</span> EXPLORATION <span className="dot">◆</span> DISCOVERY <span className="dot">◆</span> UNITY
        </div>
      </section>
    </div>
  )
}
