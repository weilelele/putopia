'use client'

import Image from 'next/image'
import { ChevronLeft, ChevronRight, RotateCw, Smartphone } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FlipWordmark } from '@/components/flip-wordmark'
import styles from './investor-deck.module.css'

type Language = 'en' | 'zh'
type Localized = { en: string; zh: string }

type AntennaWorld = {
  id: 'helix' | 'orbit' | 'fork'
  antenna: Localized
  world: Localized
  description: Localized
  image: string
}

const SLIDE_COUNT = 10
const SIGNAL_PATCHES = Array.from(
  { length: 16 },
  (_, index) => `/presentation/signal-patches/patch-${String(index + 1).padStart(2, '0')}.webp`,
)

const copy = (value: Localized, language: Language) => value[language]

const CONSOLE_CAPABILITIES: Array<{ title: Localized; description: Localized }> = [
  {
    title: { en: 'Worlds Detection', zh: '世界信号探测' },
    description: { en: 'Locate and tune into signals from parallel worlds.', zh: '寻找并调谐来自平行世界的信号。' },
  },
  {
    title: { en: 'Audio Collection', zh: '跨时空音频' },
    description: { en: 'Receive and transmit sound across worlds.', zh: '跨越世界接收与发送声音。' },
  },
  {
    title: { en: 'Quantum Discharge', zh: '量子能量释放' },
    description: { en: 'Send energy into a connected world.', zh: '向已经连接的世界释放能量。' },
  },
  {
    title: { en: 'Inner Voice', zh: '内在声音接收' },
    description: { en: 'Attempt a deeper connection with intelligent life.', zh: '尝试与智慧生命建立更深层的连接。' },
  },
]

const WORLD_DISCOVERY_STEPS: Array<{ title: Localized; description: Localized }> = [
  {
    title: { en: 'The world persists', zh: '世界持续存在' },
    description: { en: 'It keeps changing whether or not anyone is watching.', zh: '无论是否有人正在观看，它都会继续变化。' },
  },
  {
    title: { en: 'Players observe and share', zh: '玩家观测并分享' },
    description: { en: 'New phenomena are captured, reported, and shared as community evidence.', zh: '新的现象被捕捉、上报，并作为共同证据在 Community 中分享。' },
  },
  {
    title: { en: 'The community experiments', zh: '社区共同试验' },
    description: { en: 'Players test possible ways to affect the other side and compare what works.', zh: '玩家共同尝试影响另一边的方法，并比较哪些方式真正有效。' },
  },
]

const PERSONA_SIGNALS: Array<{ label: Localized; title: Localized; image: string; alt: Localized }> = [
  {
    label: { en: 'UNKNOWN PHENOMENA', zh: '未知现象' },
    title: { en: 'UFO / UAP + extraterrestrial life', zh: 'UFO / UAP 与地外文明' },
    image: '/presentation/persona/persona-unknown.jpg',
    alt: { en: 'An analog monitor observing an unexplained signal', zh: '模拟监视器正在观测未知信号' },
  },
  {
    label: { en: 'HIDDEN SYSTEMS', zh: '隐秘体系' },
    title: { en: 'Secret organizations + archives', zh: '神秘组织与隐秘档案' },
    image: '/presentation/persona/persona-archives.jpg',
    alt: { en: 'A concealed archive drawer opening', zh: '正在开启的隐秘档案抽屉' },
  },
  {
    label: { en: 'PARTICIPATORY SCI-FI', zh: '参与式科幻' },
    title: { en: 'Enter the premise—not just watch it', zh: '进入设定，而不只是观看' },
    image: '/presentation/persona/persona-participation.jpg',
    alt: { en: 'A hand reaching toward a parallel world through a console', zh: '一只手通过设备触碰平行世界' },
  },
  {
    label: { en: 'ANALOG COLLECTING', zh: '模拟硬件收藏' },
    title: { en: 'Physical objects with identity + content', zh: '兼具身份与内容的实体物件' },
    image: '/presentation/persona/persona-hardware.jpg',
    alt: { en: 'A collectible analog antenna module', zh: '具有收藏感的模拟天线模块' },
  },
]

const ANTENNA_WORLDS: AntennaWorld[] = [
  {
    id: 'helix',
    antenna: { en: 'Helix Antenna', zh: '螺旋天线' },
    world: { en: 'Cinder Plains', zh: '烬原世界' },
    description: { en: 'An amber world of monoliths and twin moons.', zh: '一个遍布巨构与双月的琥珀色世界。' },
    image: '/presentation/antenna-worlds/helix-desert.png',
  },
  {
    id: 'orbit',
    antenna: { en: 'Orbit Antenna', zh: '环形天线' },
    world: { en: 'Pelagic City', zh: '深海城市' },
    description: { en: 'A bioluminescent civilization beneath a silent ocean.', zh: '沉默海洋深处的生物光文明。' },
    image: '/presentation/antenna-worlds/orbit-ocean.png',
  },
  {
    id: 'fork',
    antenna: { en: 'Fork Antenna', zh: '音叉天线' },
    world: { en: 'Pale Cathedral', zh: '冰晶圣殿' },
    description: { en: 'A frozen signal field beneath a violet sky.', zh: '紫色天空下的冰封信号场。' },
    image: '/presentation/antenna-worlds/fork-ice.png',
  },
]

function SignalFeed({
  active,
  offset = 0,
  intervalMs = 2200,
  alt,
  eager = false,
}: {
  active: boolean
  offset?: number
  intervalMs?: number
  alt: string
  eager?: boolean
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
  const accessibleAlt = alt ? `${alt} ${String(frame + 1).padStart(2, '0')}` : ''

  return (
    <div className={styles.signalFeed}>
      <Image
        key={src}
        src={src}
        alt={accessibleAlt}
        fill
        sizes="(orientation: landscape) 48vw, 100vw"
        loading={eager ? 'eager' : 'lazy'}
        unoptimized
      />
      <span className={styles.signalFlash} aria-hidden="true" />
      <span className={styles.signalSweep} aria-hidden="true" />
    </div>
  )
}

function LanguageSwitch({ language, setLanguage }: { language: Language; setLanguage: (language: Language) => void }) {
  return (
    <div className={styles.languageSwitch} aria-label={language === 'en' ? 'Language' : '语言'}>
      <button type="button" className={language === 'en' ? styles.languageActive : ''} onClick={() => setLanguage('en')} aria-pressed={language === 'en'}>EN</button>
      <span>/</span>
      <button type="button" className={language === 'zh' ? styles.languageActive : ''} onClick={() => setLanguage('zh')} aria-pressed={language === 'zh'}>中文</button>
    </div>
  )
}

function SlideHeading({
  number,
  eyebrow,
  title,
  intro,
}: {
  number: string
  eyebrow: string
  title: string
  intro?: string
}) {
  return (
    <header className={styles.slideHeading}>
      <p className={styles.slideNumber}>{number} / {eyebrow}</p>
      <h2>{title}</h2>
      {intro && <p className={styles.slideIntro}>{intro}</p>}
    </header>
  )
}

export default function InvestorDeck() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)
  const [language, setLanguage] = useState<Language>('en')
  const [activeModule, setActiveModule] = useState<'app' | 'console'>('app')
  const [activeAntenna, setActiveAntenna] = useState<AntennaWorld['id']>('helix')

  const t = (english: string, chinese: string) => language === 'en' ? english : chinese
  const selectedAntenna = ANTENNA_WORLDS.find((antenna) => antenna.id === activeAntenna) ?? ANTENNA_WORLDS[0]

  const goTo = useCallback((index: number) => {
    const next = Math.min(Math.max(index, 0), SLIDE_COUNT - 1)
    const track = trackRef.current
    if (!track) return
    track.scrollTo({ left: track.clientWidth * next, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('button, input, textarea, select, a')) return

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

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    let frame = 0
    const keepCurrentSlideAligned = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        track.scrollTo({ left: track.clientWidth * current, behavior: 'auto' })
      })
    }

    window.addEventListener('resize', keepCurrentSlideAligned)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', keepCurrentSlideAligned)
    }
  }, [current])

  const updateCurrent = () => {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    const next = Math.round(track.scrollLeft / track.clientWidth)
    setCurrent((value) => value === next ? value : next)
  }

  return (
    <main className={styles.deckRoot} lang={language === 'en' ? 'en' : 'zh-CN'}>
      <section className={styles.rotateGate} aria-labelledby="rotate-title">
        <div className={styles.rotateBrand}>MULTIVERSE COLLECTIVE</div>
        <LanguageSwitch language={language} setLanguage={setLanguage} />
        <div className={styles.rotateIcon} aria-hidden="true">
          <Smartphone />
          <RotateCw />
        </div>
        <p className={styles.slideNumber}>LANDSCAPE BRIEFING</p>
        <h1 id="rotate-title">{t('Rotate your device to enter the briefing.', '请将设备旋转至横屏，进入项目简报。')}</h1>
        <p>{t('This presentation is composed as a cinematic, landscape-first experience.', '这份演示以横屏构图，以获得更完整的叙事与沉浸体验。')}</p>
      </section>

      <div className={styles.deckStage}>
        <header className={styles.deckHeader}>
          <div className={styles.headerBrand}>MULTIVERSE COLLECTIVE</div>
          <div className={styles.headerActions}>
            <span className={styles.viewHint}>{t('INVESTOR BRIEFING · LANDSCAPE', '投资人简报 · 横屏浏览')}</span>
            <LanguageSwitch language={language} setLanguage={setLanguage} />
          </div>
        </header>

        <div ref={trackRef} className={styles.track} onScroll={updateCurrent}>
          <section className={`${styles.slide} ${styles.cover}${current === 0 ? ` ${styles.slideActive}` : ''}`} aria-label={t('Product definition, slide 1', '项目定义，第 1 页')}>
            <div className={styles.coverSignal} aria-hidden="true">
              <SignalFeed active={current === 0} offset={12} intervalMs={2600} alt="" eager />
            </div>
            <div className={styles.coverInner}>
              <p className={styles.slideNumber}>01 / PRODUCT DEFINITION</p>
              <div className={styles.coverWordmark}><FlipWordmark maxWidth={720} fill={0.96} /></div>
              <Image className={styles.coverIcon} src="/assets/vi-icon.png" width={881} height={492} alt="Multiverse Collective" priority />
              <h1>{t('A sci-fi hardware game where fictional worlds break into real life.', '一款让虚拟世界通过实体硬件进入现实生活的科幻游戏。')}</h1>
              <p className={styles.coverLead}>{t('Hardware, game, and content become one continuously evolving universe.', '硬件、游戏与内容，共同构成一个持续演化的宇宙。')}</p>
              <div className={styles.coverThesis}><span>HARDWARE</span><span>GAME</span><span>CONTENT</span></div>
            </div>
          </section>

          <section className={`${styles.slide}${current === 1 ? ` ${styles.slideActive}` : ''}`} aria-label={t('Two product modules, slide 2', '两个产品模块，第 2 页')}>
            <div className={`${styles.slideInner} ${styles.productSlide}`}>
              <SlideHeading
                number="02"
                eyebrow="ONE PRODUCT / TWO PORTALS"
                title={t('The Internal Portal (App) builds the universe. The Console lets it enter the room.', 'Internal Portal（App）构建宇宙；Console 让它进入现实空间。')}
                intro={t('One connected experience, expressed through a digital layer and a physical object.', '同一段体验，通过数字层与实体设备共同发生。')}
              />
              <div className={styles.moduleShowcase}>
                <div className={styles.moduleTabs} role="tablist" aria-label={t('Product form', '产品形态')}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeModule === 'app'}
                    aria-controls="module-product-preview"
                    className={activeModule === 'app' ? styles.moduleTabActive : ''}
                    onClick={() => setActiveModule('app')}
                  >
                    <span>01</span>
                    <strong>INTERNAL PORTAL (APP)</strong>
                    <small>{t('The world, its stories, and its community.', '承载世界、故事与共同参与者。')}</small>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeModule === 'console'}
                    aria-controls="module-product-preview"
                    className={activeModule === 'console' ? styles.moduleTabActive : ''}
                    onClick={() => setActiveModule('console')}
                  >
                    <span>02</span>
                    <strong>MULTIVERSE CONSOLE</strong>
                    <small>{t('The physical portal into the universe.', '进入这个宇宙的实体入口。')}</small>
                  </button>
                </div>
                <div id="module-product-preview" className={styles.productPreview} role="tabpanel">
                  <div className={styles.productPreviewHeader}>
                    <span>{activeModule === 'app' ? 'INTERNAL PORTAL (APP) / CURRENT INTERFACE' : 'MULTIVERSE CONSOLE / PRODUCT VIEW'}</span>
                    <strong>{activeModule === 'app' ? t('LIVE PRODUCT VIEW', '当前产品界面') : t('HARDWARE VISUAL', '硬件效果图')}</strong>
                  </div>
                  <div className={styles.previewViewport}>
                    {activeModule === 'app' ? (
                      <iframe
                        src="/console"
                        title={t('Current Internal Portal (App) interface preview', '当前 Internal Portal（App）界面预览')}
                        loading="lazy"
                        tabIndex={-1}
                      />
                    ) : (
                      <div className={styles.consoleProductPreview}>
                        <Image
                          src="/assets/device-console.jpg"
                          fill
                          sizes="(orientation: landscape) 58vw, 100vw"
                          alt="Multiverse Console"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={`${styles.slide}${current === 2 ? ` ${styles.slideActive}` : ''}`} aria-label={t('Console capabilities, slide 3', 'Console 核心能力，第 3 页')}>
            <div className={`${styles.slideInner} ${styles.deviceSlide}`}>
              <div className={styles.deviceMedia}>
                <video src="/assets/device-reel.mp4" autoPlay muted loop playsInline preload="metadata" aria-label={t('Multiverse Console product reel', 'Multiverse Console 产品展示视频')} />
                <Image src="/assets/device-console.jpg" width={1280} height={1023} alt="Multiverse Console" priority />
              </div>
              <div className={styles.deviceCopy}>
                <SlideHeading
                  number="03"
                  eyebrow="THE CONSOLE"
                  title={t('A physical portal with four core capabilities.', '一个拥有四项核心能力的实体入口。')}
                  intro={t('Together, they turn a fictional universe into something players can detect, hear, and influence.', '它们让一个虚拟宇宙变得可被探测、聆听，甚至影响。')}
                />
                <div className={styles.capabilityGrid}>
                  {CONSOLE_CAPABILITIES.map((capability, index) => (
                    <article key={capability.title.en}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <div><h3>{copy(capability.title, language)}</h3><p>{copy(capability.description, language)}</p></div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className={`${styles.slide}${current === 3 ? ` ${styles.slideActive}` : ''}`} aria-label={t('Experience after the device, slide 4', '获得设备后的体验，第 4 页')}>
            <div className={`${styles.slideInner} ${styles.experienceSlide}`}>
              <SlideHeading
                number="04"
                eyebrow="A WORLD TO DISCOVER TOGETHER"
                title={t('The world persists. How to influence it is a mystery the community solves together.', '世界持续存在；如何影响它，则需要整个社区共同发现。')}
                intro={t('There is no fixed interaction manual. Players observe, experiment, and share evidence until the network begins to understand what works.', '系统不会预先给出固定的互动说明。玩家进行观测和尝试，并在 Community 中分享证据，逐步发现哪些行为可能对另一边产生影响。')}
              />
              <div className={styles.promiseGrid}>
                {WORLD_DISCOVERY_STEPS.map((step, index) => (
                  <article key={step.title.en}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <h3>{copy(step.title, language)}</h3>
                    <p>{copy(step.description, language)}</p>
                  </article>
                ))}
              </div>
              <div className={styles.worldSignalBand}>
                <SignalFeed active={current === 3} offset={7} intervalMs={2600} alt="" />
                <p className={styles.largeStatement}>{t('Influence may be possible. Its rules are the game everyone is exploring together.', '影响或许能够发生；而发现影响世界的规则，就是所有人共同参与的游戏。')}</p>
              </div>
            </div>
          </section>

          <section className={`${styles.slide}${current === 4 ? ` ${styles.slideActive}` : ''}`} aria-label={t('Events and observation network, slide 5', '事件与观测网络，第 5 页')}>
            <div className={`${styles.slideInner} ${styles.networkSlide}`}>
              <div className={styles.networkCopy}>
                <SlideHeading
                  number="05"
                  eyebrow="A SHARED OBSERVATION NETWORK"
                  title={t('Every device makes the fictional world more present in the real one.', '每一台设备，都让虚拟世界在现实中变得更加真实。')}
                  intro={t('As the network grows, events become something players discover and witness together.', '随着网络增长，事件会成为玩家共同发现、共同见证的现象。')}
                />
                <div className={styles.eventDefinitions}>
                  <article><span>{t('WORLD EVENTS', '世界事件')}</span><p>{t('Shared moments that can reach every Console at once.', '所有设备都可能同时接收到的共同事件。')}</p></article>
                  <article><span>{t('REGIONAL EVENTS', '区域事件')}</span><p>{t('Local phenomena unlocked as devices gather in the same place.', '随着区域设备密度增长而出现的本地现象。')}</p></article>
                </div>
              </div>
              <div className={styles.networkVisual}>
                <SignalFeed active={current === 4} offset={4} intervalMs={2400} alt={t('A shared parallel-world signal', '共同平行世界信号')} />
                <div className={styles.networkCaption}>
                  <strong>{t('ONE SIGNAL', '同一个信号')}</strong>
                  <span>{t('MANY OBSERVERS', '许多观测者')}</span>
                </div>
              </div>
            </div>
          </section>

          <section className={`${styles.slide}${current === 5 ? ` ${styles.slideActive}` : ''}`} aria-label={t('Content engine, slide 6', '内容引擎，第 6 页')}>
            <div className={`${styles.slideInner} ${styles.contentSlide}`}>
              <div className={styles.contentSignal} aria-hidden="true">
                <SignalFeed active={current === 5} offset={8} intervalMs={2600} alt="" />
                <span>PGC + UGC</span>
              </div>
              <div className={styles.contentCopy}>
                <SlideHeading
                  number="06"
                  eyebrow="CONTENT ENGINE"
                  title={t('The studio establishes the universe. The community helps it grow beyond the studio.', '团队建立宇宙；社区让它生长到团队之外。')}
                />
                <div className={styles.contentSources}>
                  <article><span>PGC</span><h3>{t('A coherent canon', '统一的正式世界')}</h3><p>{t('Core worlds, signals, and events keep the fiction moving with purpose.', '核心世界、信号与事件，持续推动正式叙事。')}</p></article>
                  <article><span>UGC</span><h3>{t('An expanding archive', '持续扩展的共同档案')}</h3><p>{t('Dreams, parallel-world records, and observations let the community add new possibilities.', '梦境、平行世界记录与观测，让社区不断加入新的可能性。')}</p></article>
                </div>
                <p className={styles.slideQuote}>{t('Controlled enough to feel real. Open enough to become larger than us.', '足够统一，才能让人相信；足够开放，才能超越团队本身。')}</p>
              </div>
            </div>
          </section>

          <section className={`${styles.slide}${current === 6 ? ` ${styles.slideActive}` : ''}`} aria-label={t('Expandable universe, slide 7', '可扩展宇宙，第 7 页')}>
            <div className={`${styles.slideInner} ${styles.expansionSlide}`}>
              <SlideHeading
                number="07"
                eyebrow="AN EXPANDABLE UNIVERSE"
                title={t('New worlds can arrive as physical objects.', '新的世界，可以通过新的实体物件到来。')}
                intro={t('Each replaceable antenna is a physical key: insert it, tune the signal, and enter its world.', '每一根可更换天线都是一把实体钥匙：插入、调谐，然后进入它所对应的世界。')}
              />
              <div
                id="antenna-world-preview"
                className={styles.antennaWorldVisual}
                role="tabpanel"
                aria-live="polite"
              >
                <Image
                  key={selectedAntenna.image}
                  src={selectedAntenna.image}
                  fill
                  sizes="(orientation: landscape) 62vw, 100vw"
                  alt={t(
                    `${selectedAntenna.antenna.en} opening ${selectedAntenna.world.en}`,
                    `${selectedAntenna.antenna.zh}正在开启${selectedAntenna.world.zh}`,
                  )}
                />
                <span className={styles.antennaNoise} aria-hidden="true" />
                <div className={styles.antennaCaption}>
                  <span>{copy(selectedAntenna.antenna, language)}</span>
                  <strong>{copy(selectedAntenna.world, language)}</strong>
                  <small>{copy(selectedAntenna.description, language)}</small>
                </div>
              </div>
              <div className={styles.expansionControls}>
                <div className={styles.antennaTabs} role="tablist" aria-label={t('Select an antenna and world', '选择天线与对应世界')}>
                  {ANTENNA_WORLDS.map((antenna, index) => (
                    <button
                      key={antenna.id}
                      type="button"
                      role="tab"
                      aria-selected={activeAntenna === antenna.id}
                      aria-controls="antenna-world-preview"
                      className={activeAntenna === antenna.id ? styles.antennaTabActive : ''}
                      onClick={() => setActiveAntenna(antenna.id)}
                    >
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <strong>{copy(antenna.antenna, language)}</strong>
                      <small>{copy(antenna.world, language)}</small>
                    </button>
                  ))}
                </div>
                <div className={styles.expansionNotes}>
                  <p><strong>{t('Physical DLC', '实体 DLC')}</strong>{t('New antennas create a recurring path into new parallel worlds.', '新的天线，持续打开新的平行世界。')}</p>
                  <p><strong>{t('Organization Token', '组织 Token')}</strong>{t('Meaningful observations can be recognized and rewarded.', '有价值的观测与上报，可以得到组织反馈。')}</p>
                </div>
              </div>
            </div>
          </section>

          <section className={`${styles.slide} ${styles.realitySlide}${current === 7 ? ` ${styles.slideActive}` : ''}`} aria-label={t('Early validation, slide 8', '早期验证，第 8 页')}>
            <div className={styles.slideInner}>
              <SlideHeading
                number="08"
                eyebrow="EARLY VALIDATION"
                title={t('People are already willing to enter the world—and commit financially.', '用户已经愿意进入这个世界，并作出真实的付费承诺。')}
                intro={t('This response appeared before the complete hardware and living-event system were fully revealed.', '这些反馈发生在硬件能力与持续事件系统尚未完整公开之前。')}
              />
              <div className={styles.metricGrid}>
                <article><span>{t('EMAIL LEAD', '邮箱留资')}</span><strong>$0.5–1</strong><small>{t('PER LEAD', '单条成本')}</small></article>
                <article><span>{t('INTERNAL PORTAL REGISTRATION', 'INTERNAL PORTAL（APP）注册')}</span><strong>$1.5–2</strong><small>{t('PER REGISTRATION', '单次注册')}</small></article>
                <article><span>{t('DEVICE DEPOSIT', '设备定金')}</span><strong>$20–25</strong><small>{t('PER PAID DEPOSIT', '单次定金转化')}</small></article>
              </div>
              <p className={styles.audienceLine}>{t('The earliest audience already overlaps science fiction, unexplained phenomena, collecting, and analog hardware.', '最早期人群天然交叠于科幻、未知现象、收藏文化与模拟硬件。')}</p>
            </div>
          </section>

          <section className={`${styles.slide} ${styles.businessSlide}${current === 8 ? ` ${styles.slideActive}` : ''}`} aria-label={t('Business opportunity, slide 9', '商业机会，第 9 页')}>
            <div className={styles.slideInner}>
              <SlideHeading
                number="09"
                eyebrow="THE OPPORTUNITY"
                title={t('A hardware business with a universe attached.', '一个连接着持续宇宙的硬件生意。')}
                intro={t('The first purchase opens the door. New worlds give people a reason to keep returning.', '第一次购买打开入口；不断出现的新世界，让用户持续回来。')}
              />
              <div className={styles.businessModel}>
                <article><span>01</span><h3>{t('CONSOLE', 'CONSOLE')}</h3><p>{t('The high-value physical entry point.', '高价值的实体入口。')}</p></article>
                <article><span>02</span><h3>{t('ANTENNA SUBSCRIPTION', '天线订阅')}</h3><p>{t('A recurring path to new worlds.', '持续通向新世界。')}</p></article>
                <article><span>03</span><h3>{t('BOUTIQUE ANTENNAS', '精品天线')}</h3><p>{t('Collectible physical expansion.', '可收藏的实体扩展。')}</p></article>
              </div>
              <div className={styles.businessConclusion}>
                <strong>{t('We are not only selling a device.', '我们销售的不只是一台设备。')}</strong>
                <p>{t('We are building a physical entrance into an evolving fictional universe.', '我们正在建立一个进入持续演化虚拟宇宙的实体入口。')}</p>
              </div>
            </div>
          </section>

          <section className={`${styles.slide} ${styles.personaSlide}${current === 9 ? ` ${styles.slideActive}` : ''}`} aria-label={t('Core audience, slide 10', '核心用户画像，第 10 页')}>
            <div className={`${styles.slideInner} ${styles.personaSlideInner}`}>
              <SlideHeading
                number="10"
                eyebrow="CORE AUDIENCE"
                title={t('A defined early audience is already here.', '一群明确的早期用户已经出现。')}
                intro={t('Approximately 40-year-old North American men.', '约 40 岁的北美男性。')}
              />
              <div className={styles.personaLayout}>
                <article className={styles.personaAnchor}>
                  <span>{t('CURRENT CORE AUDIENCE', '当前核心人群')}</span>
                  <strong>≈40</strong>
                  <h3>{t('North American men', '北美男性')}</h3>
                  <p className={styles.personaAnchorThesis}>{t('Ready to pay for a collectible portal into the fiction.', '愿意为一个可收藏、可进入的科幻入口付费。')}</p>
                </article>
                <div className={styles.personaSignals}>
                  {PERSONA_SIGNALS.map((signal, index) => (
                    <article key={signal.label.en}>
                      <div className={styles.personaSignalCopy}>
                        <span>{String(index + 1).padStart(2, '0')} / {copy(signal.label, language)}</span>
                        <h3>{copy(signal.title, language)}</h3>
                      </div>
                      <div className={styles.personaSignalArt}>
                        <Image src={signal.image} alt={copy(signal.alt, language)} fill sizes="(orientation: landscape) 18vw, 40vw" />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer className={styles.deckFooter}>
          <button type="button" className={styles.navButton} onClick={() => goTo(current - 1)} disabled={current === 0} aria-label={t('Previous slide', '上一页')}>
            <ChevronLeft aria-hidden="true" />
          </button>
          <nav className={styles.progressDots} aria-label={t('Select slide', '选择页面')}>
            {Array.from({ length: SLIDE_COUNT }, (_, index) => (
              <button key={index} type="button" className={index === current ? styles.activeDot : ''} onClick={() => goTo(index)} aria-label={t(`Go to slide ${index + 1}`, `前往第 ${index + 1} 页`)} aria-current={index === current ? 'page' : undefined} />
            ))}
          </nav>
          <span className={styles.pageCount}>{String(current + 1).padStart(2, '0')} / {String(SLIDE_COUNT).padStart(2, '0')}</span>
          <button type="button" className={styles.navButton} onClick={() => goTo(current + 1)} disabled={current === SLIDE_COUNT - 1} aria-label={t('Next slide', '下一页')}>
            <ChevronRight aria-hidden="true" />
          </button>
        </footer>
      </div>
    </main>
  )
}
