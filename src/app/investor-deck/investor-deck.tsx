'use client'

import Image from 'next/image'
import { Smartphone } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FlipWordmark } from '@/components/flip-wordmark'
import styles from './investor-deck.module.css'

const SLIDE_COUNT = 10
const SIGNAL_PATCHES = Array.from(
  { length: 16 },
  (_, index) => `/presentation/signal-patches/patch-${String(index + 1).padStart(2, '0')}.webp`,
)

function SignalFeed({
  active,
  offset = 0,
  intervalMs = 2200,
  alt,
}: {
  active: boolean
  offset?: number
  intervalMs?: number
  alt: string
}) {
  const [frame, setFrame] = useState(offset % SIGNAL_PATCHES.length)

  useEffect(() => {
    if (!active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const interval = window.setInterval(() => {
      setFrame((value) => (value + 1) % SIGNAL_PATCHES.length)
    }, intervalMs)
    return () => window.clearInterval(interval)
  }, [active, intervalMs])

  const src = SIGNAL_PATCHES[frame]

  return (
    <div className={styles.signalFeed}>
      <Image key={src} src={src} alt={`${alt} ${String(frame + 1).padStart(2, '0')}`} fill sizes="(max-width: 699px) 80vw, 42vw" unoptimized />
      <span className={styles.signalFlash} aria-hidden="true" />
      <span className={styles.signalSweep} aria-hidden="true" />
    </div>
  )
}

function MediaChrome({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className={styles.mediaChrome}>
      <div className={styles.mediaChromeTop}>
        <span>{label}</span>
        <span>LIVE ARCHIVE</span>
      </div>
      {children}
      <span className={styles.mediaReticle} aria-hidden="true" />
    </div>
  )
}

function SlideNumber({ children }: { children: React.ReactNode }) {
  return <p className={styles.slideNumber}>{children}</p>
}

export default function InvestorDeck() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)
  const [language, setLanguage] = useState<'en' | 'zh'>('en')
  const t = (english: string, chinese: string) => language === 'en' ? english : chinese

  const recruitmentSteps = language === 'en'
    ? [
        ['01', 'Sense an anomaly', 'Encounter a recruitment signal issued by the organization'],
        ['02', 'Enter the network', 'Leave contact details and register as a member'],
        ['03', 'File a record', 'Document a parallel world you have sensed'],
        ['04', 'Track the device', 'Follow discoveries, restoration, and batch progress'],
        ['05', 'Pay a deposit', 'Secure a Console allocation with a deposit during an open window'],
        ['06', 'Begin observation', 'Join the shared parallel-world observation network'],
      ]
    : [
        ['01', '感知异常', '接触组织发出的征召信号'],
        ['02', '进入网络', '留下联络方式并完成成员登记'],
        ['03', '提交记录', '记录自己感知到的平行世界'],
        ['04', '追踪设备', '了解发现、修复与批次进展'],
        ['05', '支付定金', '在开放窗口内支付定金，锁定 Console 配额'],
        ['06', '开始观测', '加入共同的平行世界观测网络'],
      ]

  const businessSteps = language === 'en'
    ? ['Worldbuilding attraction', 'Organizational recruitment', 'Internal-network registration', 'Device tracking and deposit payment', 'Console purchase', 'Ongoing observation and interaction', 'Long-term content consumption and belonging']
    : ['世界观吸引', '组织征召', '注册内部网络', '设备追踪与支付定金', '购买 Console', '持续观察与互动', '长期内容消费与身份归属']

  const audienceTerms = language === 'en'
    ? ['UFO / UAP', 'EXTRATERRESTRIAL LIFE', 'SCIENCE FICTION', 'SECRET ORGANIZATIONS', 'UNEXPLAINED PHENOMENA', 'COLLECTING', 'ALTERNATE REALITIES', 'ANALOG HARDWARE', 'COSMIC MYSTERIES', 'IMMERSIVE STORYTELLING', 'DISCLOSURE', 'THE UNKNOWN']
    : ['UFO / UAP', '地外文明', '科幻', '神秘组织', '未知现象', '收藏', '平行现实', '实体设备', '宇宙谜团', '沉浸叙事', '信息披露', '未知世界']

  const goTo = useCallback((index: number) => {
    const next = Math.min(Math.max(index, 0), SLIDE_COUNT - 1)
    const track = trackRef.current
    if (!track) return
    track.scrollTo({ left: track.clientWidth * next, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault()
        goTo(current + 1)
      }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault()
        goTo(current - 1)
      }
      if (event.key === 'Home') goTo(0)
      if (event.key === 'End') goTo(SLIDE_COUNT - 1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [current, goTo])

  const updateCurrent = () => {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    const next = Math.round(track.scrollLeft / track.clientWidth)
    setCurrent((value) => (value === next ? value : next))
  }

  return (
    <main className={styles.deckRoot} lang={language === 'en' ? 'en' : 'zh-CN'}>
      <section className={styles.orientationGate} aria-label={t('Landscape viewing required', '需要横屏浏览')}>
        <Smartphone aria-hidden="true" />
        <p className={styles.eyebrow}>{t('LANDSCAPE VIEW REQUIRED', '请使用横屏浏览')}</p>
        <h2>{t('Turn your device to continue.', '请将设备旋转至横屏后继续。')}</h2>
        <p>{t('This briefing is designed as a single-plane, landscape experience.', '本简报采用单平面横屏展示，以确保每页内容完整呈现。')}</p>
      </section>

      <div className={styles.deckStage}>
        <header className={styles.deckHeader}>
        <div className={styles.headerActions}>
          <div className={styles.headerMeta}>
            <span>LIMITED INTELLIGENCE ABOUT US</span>
          </div>
          <div className={styles.languageSwitch} aria-label={t('Language', '语言')}>
            <button type="button" className={language === 'en' ? styles.languageActive : ''} onClick={() => setLanguage('en')} aria-pressed={language === 'en'}>EN</button>
            <span>/</span>
            <button type="button" className={language === 'zh' ? styles.languageActive : ''} onClick={() => setLanguage('zh')} aria-pressed={language === 'zh'}>中文</button>
          </div>
        </div>
        </header>

        <div ref={trackRef} className={styles.track} onScroll={updateCurrent}>
        <section className={`${styles.slide} ${styles.cover}${current === 0 ? ` ${styles.slideActive}` : ''}`} aria-label={t('Cover, slide 1', '封面，第 1 页')}>
          <div className={styles.coverInner}>
            <div className={styles.coverSignal} aria-hidden="true">
              <SignalFeed active={current === 0} offset={12} intervalMs={2800} alt="" />
            </div>
            <SlideNumber>01 / ORGANIZATION FILE</SlideNumber>
            <div className={styles.coverWordmark}>
              <FlipWordmark maxWidth={680} fill={0.96} />
            </div>
            <Image className={styles.coverIcon} src="/assets/vi-icon.png" width={881} height={492} alt="平行世界观测组织图标" priority />
            <h1>{t('Not every world is as easy to discover as our own.', '并非所有世界，都像我们所在的这个世界一样容易被发现。')}</h1>
            <div className={styles.coverFooter}>
              <strong>{t('PARALLEL WORLD OBSERVATION ORGANIZATION', '平行世界观测组织')}</strong>
              <span>{t('LIMITED ACCESS / PARTIALLY DECLASSIFIED', 'LIMITED ACCESS / 部分解密')}</span>
            </div>
          </div>
        </section>

        <section className={`${styles.slide}${current === 1 ? ` ${styles.slideActive}` : ''}`} aria-label={t('Who we are, slide 2', '我们是谁，第 2 页')}>
          <div className={styles.slideInner}>
            <SlideNumber>02 / THE ORGANIZATION</SlideNumber>
            <div className={styles.statementLayout}>
              <h2>{t('We are a secret organization exploring parallel worlds.', '我们是一个探索平行世界的神秘组织。')}</h2>
              <div className={styles.proseBlock}>
                <p>{t('We believe our world is not the only one.', '我们相信，我们所在的世界并不是唯一的。')}</p>
                <p>{t('Under conditions we do not yet fully understand, other worlds leave behind signals, images, sounds, and traces that defy ordinary explanation.', '在某些尚未被完全理解的条件下，其他世界会留下信号、影像、声音，以及无法被常规经验解释的痕迹。')}</p>
                <p>{t('The mission of the Parallel World Observation Organization is to locate these traces, verify their origin, and keep a continuous record of what is happening in those worlds.', '平行世界观测组织的使命，是找到这些痕迹，确认它们的来源，并持续记录那些世界正在发生的一切。')}</p>
                <div className={styles.identityCard}>
                  <span>{t('Those selected to take part in this work', '被选中参与这项工作的人')}</span>
                  <strong>{t('VOYAGER', 'VOYAGER / 航行者')}</strong>
                </div>
              </div>
            </div>
            <div className={styles.signalStrip} aria-hidden="true">
              {[1, 5, 9, 13].map((number) => (
                <Image key={number} src={SIGNAL_PATCHES[number]} alt="" width={300} height={300} unoptimized />
              ))}
              <span className={styles.stripSweep} />
            </div>
            <blockquote>{t('We are not imagining other worlds. We are finding ways to observe them.', '我们不是在想象其他世界。我们正在寻找观测它们的方法。')}</blockquote>
          </div>
        </section>

        <section className={`${styles.slide}${current === 2 ? ` ${styles.slideActive}` : ''}`} aria-label={t('The organization’s systems, slide 3', '组织系统，第 3 页')}>
          <div className={styles.slideInner}>
            <SlideNumber>03 / TWO SYSTEMS</SlideNumber>
            <h2>{t('The organization operates through two entirely different systems.', '组织通过两套完全不同的系统运作。')}</h2>
            <div className={styles.systemGrid}>
              <article>
                <span className={styles.systemIndex}>A</span>
                <p className={styles.eyebrow}>INTERNAL NETWORK</p>
                <h3>{t('The Internal Network', '组织内部网络')}</h3>
                <p>{t('The website and app form the organization’s communication and record-keeping network. Members document parallel worlds they have detected or sensed, consult the archive, and follow each Console discovery, restoration, batch, and allocation.', '网站与 App 是内部的通信与记录系统。成员在这里记录自己探测或感知到的平行世界，查阅档案，并追踪 Console 的发现、修复、批次与订购进度。')}</p>
                <strong>{t('It does not perform direct observation.', '它不承担平行世界的直接观测。')}</strong>
                <div className={styles.systemMedia}>
                  <Image src="/voyager-pack/voyager-hero.png" width={768} height={1536} alt="组织成员材料与内部网络终端" />
                </div>
              </article>
              <article className={styles.systemConsole}>
                <span className={styles.systemIndex}>B</span>
                <p className={styles.eyebrow}>MULTIVERSE CONSOLE</p>
                <h3>{t('Parallel World Observation Instrument', '平行世界观测仪')}</h3>
                <p>{t('The organization’s most important device. Only through it can we cross the boundary of our world and witness what is happening in another.', '组织最重要的设备。只有通过它，我们才有可能越过当前世界的边界，看到另一个世界正在发生什么。')}</p>
                <strong>{t('It connects us to other worlds.', '它连接我们与其他世界。')}</strong>
                <div className={styles.systemMedia}>
                  <Image src="/assets/device-console.jpg" width={1280} height={1024} alt="Multiverse Console 设备展示" />
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className={`${styles.slide} ${styles.deviceSlide}${current === 3 ? ` ${styles.slideActive}` : ''}`} aria-label={t('Multiverse Console, slide 4', 'Multiverse Console，第 4 页')}>
          <div className={`${styles.slideInner} ${styles.deviceLayout}`}>
            <div className={styles.deviceCopy}>
              <SlideNumber>04 / THE DEVICE</SlideNumber>
              <p className={styles.eyebrow}>MULTIVERSE CONSOLE</p>
              <h2>{t('It is not a media player. It is an observation window.', '它不是内容播放器。它是一扇观察窗口。')}</h2>
              <p>{t('The Console captures unusual frequencies from parallel worlds and translates them into observable images and sound.', 'Console 捕捉来自平行世界的特殊波段，并将信号转化为可被观察的影像与声音。')}</p>
              <p>{t('Multiple units can tune into the same public observation band. Individual batches may also have distinct tuning ranges, revealing fragments that other units cannot yet receive.', '多台设备可以进入同一个公共观测波段。不同批次也可能拥有特殊的调谐范围，接收到其他设备暂时无法捕捉的世界片段。')}</p>
              <blockquote>{t('The observation window may close. Time in that world does not stop.', '观测窗口可以关闭，那个世界的时间却不会因此停下。')}</blockquote>
            </div>
            <div className={styles.deviceGallery}>
              <MediaChrome label="CONSOLE / ACTIVE UNIT">
                <video src="/assets/device-reel.mp4" autoPlay muted loop playsInline preload="metadata" aria-label="网站当前使用的 Multiverse Console 展示视频" />
              </MediaChrome>
              <div className={styles.deviceGalleryRow}>
                <figure className={styles.deviceFigure}>
                  <Image src="/assets/device-console.jpg" width={1280} height={1023} alt="网站当前使用的 Multiverse Console 功能照片" priority />
                  <figcaption>FUNCTION MAP</figcaption>
                </figure>
                <figure className={styles.deviceFigure}>
                  <Image src="/presentation/mc-cologne.png" width={834} height={914} alt="位于科隆的 Multiverse Console 实物照片" />
                  <figcaption>MC-COLOGNE / KN-1</figcaption>
                </figure>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.slide} ${styles.rulesSlide}${current === 4 ? ` ${styles.slideActive}` : ''}`} aria-label={t('Confirmed rules, slide 5', '观测规律，第 5 页')}>
          <div className={styles.slideInner}>
            <SlideNumber>05 / CONFIRMED RULES</SlideNumber>
            <h2>{t('So far, we have confirmed only two rules of parallel worlds.', '关于平行世界，我们目前只确认了两条规律。')}</h2>
            <div className={styles.rulesLayout}>
              <div className={styles.ruleGrid}>
                <article>
                  <span>01</span>
                  <h3>{t('Continuous observation', '持续观察')}</h3>
                  <p>{t('We are not watching a story that has already happened. The Console behaves more like a surveillance camera pointed across the boundary between worlds.', '我们并不是在观看一段已经发生过的故事。Console 更接近一台跨越世界边界的监控摄像头。')}</p>
                  <p>{t('Observers cannot choose what appears next or ask an event to happen again.', '观察者无法指定接下来会出现什么，也无法要求某个事件重新发生。')}</p>
                </article>
                <article>
                  <span>02</span>
                  <h3>{t('Synchronized time', '时间同步')}</h3>
                  <p>{t('Time in a parallel world passes in sync with time in ours.', '平行世界中的时间，与我们所在世界的时间同步流逝。')}</p>
                  <p>{t('A lost connection may cause us to miss an event that will never recur. By the time contact is restored, that world may already have changed.', '一次中断可能让我们错过无法再次出现的事件；重新连接时，那个世界也可能已经改变。')}</p>
                </article>
              </div>
              <div className={styles.observationLens}>
                <SignalFeed active={current === 4} offset={0} intervalMs={2350} alt="来自公共平行世界的实时观测画面" />
                <div className={styles.feedOverlay} aria-hidden="true">
                  <span>LIVE / WORLD-MC-083</span>
                  <span>REC ●</span>
                  <span>CAM 01 / FIXED</span>
                  <span>TIME SYNC / ACTIVE</span>
                </div>
              </div>
            </div>
            <blockquote>{t('They do not exist to be watched by us. We have merely found a window through which to see them.', '它们不是为了被我们观看而存在。我们只是获得了一个看见它们的窗口。')}</blockquote>
          </div>
        </section>

        <section className={`${styles.slide}${current === 5 ? ` ${styles.slideActive}` : ''}`} aria-label={t('Shared observation, slide 6', '共同观测网络，第 6 页')}>
          <div className={styles.slideInner}>
            <SlideNumber>06 / SHARED OBSERVATION</SlideNumber>
            <h2>{t('Shared worlds. Different observation windows.', '共同的世界。不同的观测窗口。')}</h2>
            <div className={styles.networkLayout}>
              <div className={styles.networkCore}>
                <SignalFeed active={current === 5} offset={6} intervalMs={2600} alt="公共平行世界观测画面" />
                <strong>PUBLIC<br />WORLD</strong>
                <span className={styles.orbitNodeA}><SignalFeed active={current === 5} offset={2} intervalMs={3100} alt="批次 A 观测画面" /></span>
                <span className={styles.orbitNodeB}><SignalFeed active={current === 5} offset={10} intervalMs={2900} alt="批次 B 观测画面" /></span>
              </div>
              <div className={styles.networkNotes}>
                <p>{t('Many Consoles are pointed at the same public parallel worlds. Different Voyagers are witnessing the continuing evolution of a shared reality.', '许多 Console 正在指向相同的公共平行世界。不同航行者看到的是同一个世界持续发生的变化。')}</p>
                <ul>
                  <li>{t('Public worlds form the foundation of long-term observation', '公共世界构成长期观测的基础')}</li>
                  <li>{t('Different batches have different frequency sensitivity', '不同批次拥有不同的波段敏感度')}</li>
                  <li>{t('Some material appears only briefly to specific batches', '部分内容只在特定批次短暂出现')}</li>
                  <li>{t('Records from multiple batches can corroborate one another', '多个批次的记录可以彼此印证')}</li>
                </ul>
              </div>
            </div>
            <blockquote>{t('We share the same multiverse, but no device can see all of it at once.', '我们共享同一个多元宇宙，但并非所有设备都能同时看见它的全部。')}</blockquote>
          </div>
        </section>

        <section className={`${styles.slide}${current === 6 ? ` ${styles.slideActive}` : ''}`} aria-label={t('What remains unknown, slide 7', '未知部分，第 7 页')}>
          <div className={styles.slideInner}>
            <SlideNumber>07 / WHAT REMAINS UNKNOWN</SlideNumber>
            <h2>{t('The questions that matter most remain unanswered.', '真正重要的部分，仍然处于未知之中。')}</h2>
            <div className={styles.unknownLayout}>
              <div className={styles.unknownGrid}>
                <p>{t('Which worlds can become aware of our existence?', '哪些世界能够意识到我们的存在？')}</p>
                <p>{t('Does observation affect the other side?', '观测行为是否会影响另一边？')}</p>
                <p>{t('How might interaction become possible?', '我们可以通过什么方式与它们互动？')}</p>
                <p>{t('When is the right moment to intervene?', '哪一个瞬间，才是介入的正确时机？')}</p>
                <p>{t('Would an intervention alter an event—or an entire world?', '一次介入会改变事件，还是整个世界？')}</p>
                <p>{t('Does an unusual signal come from a new world, or from an unseen part of a public one?', '特殊信号来自新的世界，还是公共世界中未被看见的部分？')}</p>
              </div>
              <div className={styles.worldLens} aria-label={t('Unresolved parallel-world signal', '尚未确认的平行世界信号画面')}>
                <SignalFeed active={current === 6} offset={11} intervalMs={2450} alt={t('Unresolved signal', '未确认信号')} />
                <span className={styles.worldLensRing} aria-hidden="true" />
                <span className={styles.worldLensLabel}>{t('UNRESOLVED SIGNAL / LIVE', '未确认信号 / 实时')}</span>
              </div>
            </div>
            <div className={styles.unknownConclusion}>
              <span>{t('We have already detected feedback that observation alone cannot explain.', '目前已经出现了一些无法被单纯观察解释的反馈。')}</span>
              <strong>{t('Observation has begun. The rules of interaction remain to be discovered.', '观测已经开始。互动的规则，仍等待被发现。')}</strong>
            </div>
          </div>
        </section>

        <section className={`${styles.slide}${current === 7 ? ` ${styles.slideActive}` : ''}`} aria-label={t('Recruitment protocol, slide 8', '征召路径，第 8 页')}>
          <div className={styles.slideInner}>
            <SlideNumber>08 / RECRUITMENT PROTOCOL</SlideNumber>
            <h2>{t('From being found to receiving an observation instrument.', '从被发现，到获得观测设备。')}</h2>
            <div className={styles.pathLayout}>
              <div className={styles.journeyTrack}>
                {recruitmentSteps.map(([number, title, copy]) => (
                  <article key={number}>
                    <span className={styles.journeyNode}>{number}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{copy}</p>
                    </div>
                  </article>
                ))}
                <span className={styles.journeyPulse} aria-hidden="true" />
              </div>
              <figure className={styles.recruitmentImage}>
                <Image src="/voyager-pack/voyager-hero.png" width={768} height={1536} alt="航行者身份材料与组织终端" />
                <figcaption>FROM RECRUITMENT TO OBSERVATION</figcaption>
              </figure>
            </div>
            <blockquote>{t('A Voyager’s journey does not begin when the device is switched on. It begins with the realization that this may not be the only world.', '一名航行者的旅程，不是从打开设备开始，而是从意识到这个世界可能并不唯一开始。')}</blockquote>
          </div>
        </section>

        <section className={`${styles.slide} ${styles.reality}${current === 8 ? ` ${styles.slideActive}` : ''}`} aria-label={t('Early market validation, slide 9', '早期市场验证，第 9 页')}>
          <div className={styles.slideInner}>
            <p className={styles.transmissionEnd}>END OF TRANSMISSION</p>
            <SlideNumber>09 / EARLY MARKET VALIDATION</SlideNumber>
            <h2>{t('Worldbuilding-led recruitment is already demonstrating exceptional acquisition efficiency.', '世界观驱动的征召机制，已经表现出显著的获客效率。')}</h2>
            <div className={styles.metricGrid}>
              <article>
                <span>{t('Email lead', '邮箱留资')}</span>
                <strong>$0.5–1</strong>
                <small>PER LEAD</small>
              </article>
              <article>
                <span>{t('Website and app registration', '网站与 App 注册')}</span>
                <strong>$1.5–2</strong>
                <small>PER REGISTRATION</small>
              </article>
              <article>
                <span>{t('Paid device deposit', '支付设备定金')}</span>
                <strong>$20–25</strong>
                <small>PER PAID DEPOSIT</small>
              </article>
            </div>
            <div className={styles.realitySummary}>
              <p>{t('Even before the device’s full capabilities, specific worlds, or interaction mechanics have been disclosed, the project has generated sustained user response at low acquisition cost.', '在尚未完整公开设备能力、具体世界和互动机制的情况下，项目已经获得低成本且持续的用户响应。')}</p>
              <strong>{t('What has been validated is more than interest in a device: users are willing to enter this world, identify with it, and commit financially by paying a deposit.', '得到验证的，不只是用户对设备的兴趣，而是用户愿意主动进入这套世界观，并通过支付定金作出真实的付费承诺。')}</strong>
            </div>
          </div>
        </section>

        <section className={`${styles.slide} ${styles.reality} ${styles.businessSlide}${current === 9 ? ` ${styles.slideActive}` : ''}`} aria-label={t('The business, slide 10', '商业模型，第 10 页')}>
          <div className={styles.slideInner}>
            <SlideNumber>10 / THE BUSINESS</SlideNumber>
            <h2>{t('A game product embodied in hardware. An enduring content and experience business.', '一个硬件化的游戏产品。一种长期的内容与体验消费。')}</h2>
            <div className={styles.businessLayout}>
              <div className={styles.businessFlow}>
                {businessSteps.map((item, index) => (
                  <div key={item}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{item}</strong>
                  </div>
                ))}
              </div>
              <div className={styles.audienceCard}>
                <p className={styles.eyebrow}>CURRENT CORE AUDIENCE</p>
                <strong>{t('North American men, approximately 40 years old', '约 40 岁的北美男性')}</strong>
                <p>{t('They have a long-standing interest in extraterrestrial life, UFO / UAP phenomena, secret organizations, and the unexplained. They love science fiction and are willing to pay for a physical device with collectible value, identity significance, and an evolving content experience.', '长期关注地外文明、UFO / UAP、神秘组织与未知现象；热爱科幻，并愿意为具有收藏属性、身份意义和持续内容能力的实体设备付费。')}</p>
                <hr />
                <p>{t('Public worlds sustain a shared long-term narrative. Batch-specific frequencies create differentiated content and collectible value.', '公共世界提供共享的长期叙事，批次特有波段提供差异化内容与收藏价值。')}</p>
                <div className={styles.personaCloud} aria-label={t('Audience interest cloud', '用户兴趣词云')}>
                  {audienceTerms.map((term) => <span key={term}>{term}</span>)}
                </div>
              </div>
            </div>
            <blockquote>{t('The physical device creates the first high-value conversion; continuously unfolding worlds, events, and interactions sustain long-term experiential value.', '以实体设备完成首次高价值转化，以持续发生的世界、事件与互动维持长期体验价值。')}</blockquote>
          </div>
        </section>
        </div>

      </div>

      <nav className={styles.progressDots} aria-label={t('Select slide', '选择页面')}>
        {Array.from({ length: SLIDE_COUNT }, (_, index) => (
          <button
            key={index}
            type="button"
            className={index === current ? styles.activeDot : ''}
            onClick={() => goTo(index)}
            aria-label={t(`Go to slide ${index + 1}`, `前往第 ${index + 1} 页`)}
            aria-current={index === current ? 'page' : undefined}
          />
        ))}
      </nav>
    </main>
  )
}
