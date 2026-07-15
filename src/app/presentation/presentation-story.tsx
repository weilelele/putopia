'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

import { FlipWordmark } from '@/components/flip-wordmark'

import styles from './presentation.module.css'

const chapters = [
  '标识',
  '你相信吗',
  '征召',
  '证据',
  '实物接触',
  '第一次观测',
  '组织档案',
  '危机',
  '连接',
  '观测仪',
  '寻找世界',
  '固定机位',
  '量子扰动',
  '未知',
  '使命',
  '搜寻',
  '提出世界',
  '加入组织',
]

const signalPatchImages = Array.from(
  { length: 16 },
  (_, index) => `/presentation/signal-patches/patch-${String(index + 1).padStart(2, '0')}.webp`,
)

function SignalPatchCarousel({
  active,
  alt,
  offset = 0,
  intervalMs = 2200,
  sizes,
}: {
  active: boolean
  alt: string
  offset?: number
  intervalMs?: number
  sizes: string
}) {
  const [index, setIndex] = useState(offset % signalPatchImages.length)

  useEffect(() => {
    if (!active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % signalPatchImages.length)
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [active, intervalMs])

  return (
    <div className={styles.signalPatchCarousel}>
      <Image
        key={signalPatchImages[index]}
        className={styles.signalPatchImage}
        src={signalPatchImages[index]}
        alt={`${alt} ${String(index + 1).padStart(2, '0')}`}
        fill
        sizes={sizes}
        unoptimized
      />
      <span key={`flash-${index}`} className={styles.signalPatchFlash} aria-hidden />
    </div>
  )
}

function DeviceWindow({
  src,
  alt,
  label,
  className = '',
  contain = false,
}: {
  src: string
  alt: string
  label: string
  className?: string
  contain?: boolean
}) {
  return (
    <figure className={`${styles.deviceWindow} ${className}`}>
      <div className={styles.deviceWindowTop}>
        <span>{label}</span>
        <span>LIVE ARCHIVE</span>
      </div>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 767px) 88vw, 48vw"
        style={{ objectFit: contain ? 'contain' : 'cover' }}
      />
      <div className={styles.deviceWindowReticle} aria-hidden />
      <figcaption>CONFIRMED DEVICE / MULTIVERSE CONSOLE</figcaption>
    </figure>
  )
}

function VideoWindow({
  src,
  label,
  ariaLabel,
  className = '',
}: {
  src: string
  label: string
  ariaLabel: string
  className?: string
}) {
  return (
    <figure className={`${styles.deviceWindow} ${className}`}>
      <div className={styles.deviceWindowTop}>
        <span>{label}</span>
        <span>LIVE ARCHIVE</span>
      </div>
      <video
        className={styles.deviceWindowVideo}
        src={src}
        aria-label={ariaLabel}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
      <div className={styles.deviceWindowReticle} aria-hidden />
      <figcaption>CONFIRMED DEVICE / MULTIVERSE CONSOLE</figcaption>
    </figure>
  )
}

export function PresentationStory() {
  const scrollerRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const [recruitedAnimationStarted, setRecruitedAnimationStarted] = useState(false)
  const [transmission, setTransmission] = useState(false)

  const goTo = useCallback((index: number) => {
    const scroller = scrollerRef.current
    const target = scroller?.querySelector<HTMLElement>(`[data-chapter="${index}"]`)
    if (!scroller || !target) return

    const previousScrollBehavior = scroller.style.scrollBehavior
    scroller.style.scrollBehavior = 'auto'
    scroller.scrollTop = target.offsetTop
    window.requestAnimationFrame(() => {
      scroller.style.scrollBehavior = previousScrollBehavior
    })
  }, [])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const sections = Array.from(scroller.querySelectorAll<HTMLElement>('[data-chapter]'))
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) {
          const chapter = Number((visible.target as HTMLElement).dataset.chapter)
          setActive(chapter)
          if (chapter === 2) setRecruitedAnimationStarted(true)
        }
      },
      { root: scroller, threshold: [0.45, 0.65, 0.85] },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(event.key)) {
        event.preventDefault()
        goTo(Math.min(active + 1, chapters.length - 1))
      }
      if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key)) {
        event.preventDefault()
        goTo(Math.max(active - 1, 0))
      }
      if (event.key === 'Home') goTo(0)
      if (event.key === 'End') goTo(chapters.length - 1)
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [active, goTo])

  const sendTransmission = () => {
    setTransmission(true)
    window.setTimeout(() => setTransmission(false), 2800)
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <div className={styles.sessionMeta}>
          <span className={styles.liveDot}>LIVE</span>
        </div>
      </header>

      <nav className={styles.rail} aria-label="演讲章节">
        <span className={styles.railCount}>{String(active + 1).padStart(2, '0')}</span>
        <div className={styles.railTrack}>
          {chapters.map((chapter, index) => (
            <button
              key={chapter}
              type="button"
              className={index === active ? styles.railActive : undefined}
              onClick={() => goTo(index)}
              aria-label={`前往第 ${index + 1} 节：${chapter}`}
              aria-current={index === active ? 'step' : undefined}
            />
          ))}
        </div>
        <span className={styles.railCount}>{String(chapters.length).padStart(2, '0')}</span>
      </nav>

      <main ref={scrollerRef} className={styles.scroller}>
        <section className={`${styles.block} ${styles.logoCover}`} data-chapter="0">
          <Image
            className={styles.coverLogo}
            src="/assets/vi-icon.png"
            alt="Multiverse Collective"
            width={881}
            height={492}
            sizes="(max-width: 767px) 54vw, 360px"
            preload
          />
        </section>

        <section className={`${styles.block} ${styles.opening}`} data-chapter="1">
          <div className={styles.gridField} />
          <div className={styles.openingCopy}>
            <p className={styles.kicker}>PARALLEL WORLD EXPLORATION ORGANIZATION</p>
            <h1>你们相信<br /><em>平行世界</em>吗？</h1>
            <p className={styles.lede}>一开始，我是不信的。</p>
          </div>
          <button className={styles.scrollCue} type="button" onClick={() => goTo(2)}>
            <span>开始观测</span>
            <span aria-hidden>↓</span>
          </button>
        </section>

        <section className={`${styles.block} ${styles.recruited}`} data-chapter="2">
          <div className={styles.centerStatement}>
            <span className={styles.dateStamp}>两年前 / 某一天</span>
            <h2>我被<em>征召</em>进了一个<br />平行世界观测组织</h2>
            <div className={styles.namePlate}>
              {recruitedAnimationStarted && (
                <FlipWordmark
                  maxWidth={616}
                  fill={0.858}
                  className={styles.recruitedWordmark}
                  forceAnimate
                />
              )}
            </div>
            <p>我以为他们是一群疯子。<br />但好奇心让我留了下来。</p>
          </div>
        </section>

        <section className={`${styles.block} ${styles.evidence}`} data-chapter="3">
          <div className={styles.evidenceCopy}>
            <p className={styles.kicker}>EVIDENCE / 001</p>
            <h2>然后，<br />他们拿出了<em>证据</em>。</h2>
            <p>一台——或者很多台——<br />平行世界观测仪。</p>
            <div className={styles.objectTag}>MULTIVERSE CONSOLE</div>
          </div>
          <DeviceWindow
            src="/presentation/mc-cologne.png"
            alt="位于科隆的 Multiverse Console 实物"
            label="MC-COLOGNE / KN-1"
            className={styles.evidenceWindow}
          />
        </section>

        <section className={`${styles.block} ${styles.realObject}`} data-chapter="4">
          <div className={styles.realCopy}>
            <span>NOT AI GENERATED</span>
            <span>NOT A 3D RENDER</span>
            <h2>NO.<br /><em>它真实存在。</em></h2>
            <p>第一次触摸它，第一次转动两侧旋钮，<br />我浑身感到了酥麻。</p>
          </div>
          <VideoWindow
            src="/assets/device-reel.mp4"
            ariaLabel="Multiverse Console onboarding 展示视频"
            label="ONBOARDING / CONSOLE REEL"
            className={styles.contactWindow}
          />
        </section>

        <section className={`${styles.block} ${styles.firstSight}`} data-chapter="5">
          <div className={styles.lens}>
            <SignalPatchCarousel
              active={active === 5}
              alt="被观测到的平行世界信号"
              sizes="70vw"
            />
            <div className={styles.scanLine} />
          </div>
          <div className={styles.sightCopy}>
            <p>你会问我看见了什么？</p>
            <h2>我看见了一些<br />我可能<em>本不应该</em><br />看到的东西。</h2>
          </div>
        </section>

        <section className={`${styles.block} ${styles.archive}`} data-chapter="6">
          <div className={styles.archiveIntro}>
            <p className={styles.kicker}>FOUNDING DATE / UNKNOWN</p>
            <h2>没有人能明确说明，<br />这一切从何时开始。</h2>
          </div>
          <div className={styles.timeline}>
            <article>
              <span className={styles.timelineYear}>1980s</span>
              <span className={styles.personPortrait}>
                <Image src="/presentation/ryo-tanaka.jpg" alt="Ryo Tanaka" fill sizes="72px" />
              </span>
              <div>
                <h3>RYO</h3>
                <p>日本。组织里最年长的参与者。<br />在一家旧货铺找到第一台 Console。</p>
              </div>
            </article>
            <article>
              <span className={styles.timelineYear}>≈ 2000</span>
              <span className={styles.personPortrait}>
                <Image src="/presentation/valentina-cruz.jpg" alt="Valentina Cruz" fill sizes="72px" />
              </span>
              <div>
                <h3>CRUZ</h3>
                <p>墨西哥。优雅且富有激情。<br />让更多人知道组织，也拥有 Console。</p>
              </div>
            </article>
          </div>
        </section>

        <section className={`${styles.block} ${styles.crisis}`} data-chapter="7">
          <div className={styles.noiseCloud} aria-hidden>
            {['AI', '010011', 'FEED', '∞', 'SWIPE', 'DATA', 'NEXT', 'NOISE', '0010110', 'ALERT', 'MORE', 'SCROLL'].map((item, index) => (
              <span key={item} style={{ '--i': index } as React.CSSProperties}>{item}</span>
            ))}
          </div>
          <div className={styles.crisisCopy}>
            <p className={styles.kicker}>WHY RECRUIT MORE PEOPLE?</p>
            <h2>因为我们正面临<br />一场<em>巨大的危机</em>。</h2>
            <p>海量信息占据大脑与思维带宽。<br />更重要的是——</p>
            <strong>它们正在破坏世界之间的连接。</strong>
          </div>
        </section>

        <section className={`${styles.block} ${styles.connection}`} data-chapter="8">
          <div className={styles.worldModel} aria-hidden>
            <span className={styles.worldCore}>THIS<br />WORLD</span>
            <span className={`${styles.otherWorld} ${styles.worldA}`} />
            <span className={`${styles.otherWorld} ${styles.worldB}`} />
            <span className={`${styles.otherWorld} ${styles.worldC}`} />
            <span className={`${styles.worldLink} ${styles.linkA}`} />
            <span className={`${styles.worldLink} ${styles.linkB}`} />
            <span className={`${styles.worldLink} ${styles.linkC}`} />
          </div>
          <div className={styles.connectionCopy}>
            <h2>我们的世界，<br />像一座<em>悬浮的岛屿</em>。</h2>
            <p>连接越强，世界越稳定。</p>
            <p>连接松动、消失——<br />岛屿就会坠落、崩坏。</p>
          </div>
        </section>

        <section className={`${styles.block} ${styles.anatomy}`} data-chapter="9">
          <div className={styles.anatomyCopy}>
            <p>它像收音机，<br />却不接收任何广播。</p>
            <h2>它调谐的是<br /><em>另一个世界。</em></h2>
          </div>
          <DeviceWindow
            src="/assets/device-console.jpg"
            alt="Multiverse Console 首页功能说明图"
            label="CONSOLE FUNCTIONS / SYSTEM MAP"
            className={styles.anatomyWindow}
            contain
          />
        </section>

        <section className={`${styles.block} ${styles.worldSearch}`} data-chapter="10">
          <div className={styles.channelDial} aria-hidden>
            <div className={styles.dialNumbers}>07.83</div>
            <div className={styles.dialRings} />
          </div>
          <div className={styles.searchCopy}>
            <p>旋动旋钮，不是在调频。</p>
            <h2>是在寻找宇宙间<br />不同的<em>平行世界</em>。</h2>
          </div>
          <div className={styles.possibilityList}>
            <span>历史交叉口延续出的世界</span>
            <span>此刻的另一种可能</span>
            <span>我们从未知晓的世界</span>
          </div>
        </section>

        <section className={`${styles.block} ${styles.liveFeed}`} data-chapter="11">
          <div className={styles.feedScreen}>
            <SignalPatchCarousel
              active={active === 11}
              alt="来自平行世界固定机位的观测画面"
              offset={8}
              intervalMs={2470}
              sizes="(max-width: 767px) 92vw, 65vw"
            />
            <div className={styles.feedOverlay}>
              <span>LIVE / WORLD-MC-083</span>
              <span>REC ●</span>
              <span>CAM 01 / FIXED</span>
              <span>NO RETURN SIGNAL</span>
            </div>
          </div>
          <div className={styles.feedCopy}>
            <h2>圆形屏幕里，<br />是那个世界的<em>实况直播</em>。</h2>
            <p>一个潜藏在那个世界里的固定机位。<br />我们通过它，凝视远方。</p>
          </div>
        </section>

        <section className={`${styles.block} ${styles.quantum}`} data-chapter="12">
          <div className={styles.quantumCopy}>
            <p className={styles.kicker}>ONE-WAY TRANSMISSION</p>
            <h2>但观测，<br />并不只是<em>观看</em>。</h2>
            <p>按下橙色按钮，扰动那个世界。<br />留下一段简短的话，让某个智慧生命听见。</p>
          </div>
          <button
            type="button"
            className={`${styles.quantumButton} ${transmission ? styles.quantumButtonActive : ''}`}
            onClick={sendTransmission}
            aria-label="发送一段量子扰动"
          >
            <span>PRESS</span>
          </button>
          <div className={`${styles.transmissionWave} ${transmission ? styles.waveActive : ''}`} aria-hidden />
          <p className={`${styles.transmissionText} ${transmission ? styles.transmissionVisible : ''}`} aria-live="polite">
            TRANSMISSION SENT<br />“你不是独自一人。”
          </p>
        </section>

        <section className={`${styles.block} ${styles.unknown}`} data-chapter="13">
          <div className={styles.unknownCopy}>
            <p>里面到底有哪些世界？</p>
            <p>是不是预先设置好的？</p>
            <p>它们会发生什么？</p>
            <h2>抱歉，<br /><em>我完全不知道。</em></h2>
          </div>
          <div className={styles.unknownCounter}>
            <span>CATALOGUED</span>
            <strong>— — —</strong>
            <span>DISCOVERY IN PROGRESS</span>
          </div>
        </section>

        <section className={`${styles.block} ${styles.mission}`} data-chapter="14">
          <div className={styles.missionImage}>
            <Image src="/voyager-pack/voyager-hero.png" alt="Multiverse Collective Voyager 物资" fill sizes="(max-width: 767px) 80vw, 38vw" />
          </div>
          <div className={styles.missionCopy}>
            <p className={styles.kicker}>CURRENT ASSIGNMENT</p>
            <h2>发现更多 Console。<br />修复它们。<br /><em>传递给需要的人。</em></h2>
            <p>这是我当下的使命。</p>
          </div>
        </section>

        <section className={`${styles.block} ${styles.searchMap}`} data-chapter="15">
          <div className={styles.mapGrid} aria-hidden />
          <div className={styles.locationList}>
            <article><span>01</span><strong>非洲</strong><p>某个地方的旧货市场</p></article>
            <article><span>02</span><strong>德国</strong><p>某个教堂的侧室</p></article>
            <article><span>03</span><strong>南美洲</strong><p>森林深处</p></article>
            <article><span>04</span><strong>中国 · 贵州</strong><p>某个偏远的寨子</p></article>
          </div>
          <div className={styles.finalCopy}>
            <p>它们可能在这里，<br />也可能在那里。</p>
            <h2>而我们，会继续<br /><em>找到它们。</em></h2>
          </div>
        </section>

        <section className={`${styles.block} ${styles.proposeWorld}`} data-chapter="16">
          <div className={styles.proposeCopy}>
            <p className={styles.kicker}>THERE IS ANOTHER WAY TO PARTICIPATE</p>
            <h2>你也可以告诉我们，<br />那个你<em>相信存在</em>的世界。</h2>
            <p>它可能来自想象，来自一个梦，<br />也可能是你曾经真正看到过的片段。</p>
          </div>
        </section>

        <section className={`${styles.block} ${styles.join}`} data-chapter="17">
          <div className={styles.joinCopy}>
            <h2>加入我们<br />成为Voygaer<br /><em>申请观测设备</em></h2>
          </div>
          <div className={styles.qrFrame}>
            <Image
              src="/presentation/multiverseco-qr.png"
              alt="扫描进入 multiverseco.org"
              width={600}
              height={600}
              sizes="(max-width: 767px) 58vw, 360px"
            />
            <span>SCAN TO ENTER</span>
          </div>
        </section>
      </main>
    </div>
  )
}
