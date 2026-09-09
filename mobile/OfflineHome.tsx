import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { absoluteOfflineMediaUrl } from './offline'
import type {
  OfflineDevice,
  OfflineIntel,
  OfflineMediaMap,
  OfflineSnapshot,
  OfflineStory,
  OfflineTab,
  OfflineVote,
  OfflineVoyager,
  OfflineWorld,
} from './offline'

interface OfflineHomeProps {
  connected: boolean
  reconnecting: boolean
  snapshot: OfflineSnapshot | null
  media: OfflineMediaMap
  onRetry: () => void
}

type DetailKind = 'intel' | 'device' | 'world' | 'voyager' | 'story' | 'vote'
type DetailSelection = { kind: DetailKind; id: string } | null
type IntelMode = 'intel' | 'votes'
type VoyagerMode = 'voyagers' | 'logs'

const TABS: { key: OfflineTab; label: string; icon: number }[] = [
  { key: 'dashboard', label: 'DASHBOARD', icon: require('./assets/navigation/LayoutDashboard.png') },
  { key: 'intel', label: 'INTEL', icon: require('./assets/navigation/FileText.png') },
  { key: 'devices', label: 'DEVICES', icon: require('./assets/navigation/Gamepad2.png') },
  { key: 'worlds', label: 'WORLDS', icon: require('./assets/navigation/Globe.png') },
  { key: 'voyagers', label: 'VOYAGERS', icon: require('./assets/navigation/Users.png') },
]

const STAGE_LABEL: Record<OfflineWorld['lifecycle_state'], string> = {
  proposed: 'INITIAL VISION',
  picked: 'SIGNAL TUNING',
  syncing: 'SIGNAL TUNING',
  stable: 'ESTABLISHED',
}

const STATUS_LABEL: Record<string, string> = {
  available: 'AVAILABLE',
  in_use: 'IN USE',
  needs_repair: 'NEEDS REPAIR',
  unknown: 'UNKNOWN',
}

function formatDate(value: string | null | undefined, includeTime = false): string {
  if (!value) return 'UNKNOWN'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value)
  if (Number.isNaN(date.getTime())) return 'UNKNOWN'
  return date.toLocaleString(undefined, includeTime
    ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase()
}

function initials(value: string): string {
  return value.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

function mediaUri(remote: string | null | undefined, media: OfflineMediaMap): string | null {
  if (!remote) return null
  return media[absoluteOfflineMediaUrl(remote)] ?? null
}

function CachedImage({ uri, media, style = styles.cardImage }: {
  uri: string | null | undefined
  media: OfflineMediaMap
  style?: object
}) {
  const source = mediaUri(uri, media)
  if (!source) return null
  return <Image source={{ uri: source }} resizeMode="cover" style={style} />
}

function SectionTitle({ children, action }: { children: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action}
    </View>
  )
}

function EmptyState({ children }: { children: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{children}</Text>
    </View>
  )
}

function ReadOnlyBadge() {
  return <Text style={styles.readOnly}>OFFLINE · READ ONLY</Text>
}

function ListCard({
  title,
  meta,
  body,
  image,
  media,
  onPress,
}: {
  title: string
  meta: string
  body?: string | null
  image?: string | null
  media: OfflineMediaMap
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.listCard, pressed && styles.pressed]}
    >
      {image !== undefined && <CachedImage uri={image} media={media} />}
      <View style={styles.listCardCopy}>
        <Text style={styles.meta}>{meta}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
        {body ? <Text numberOfLines={3} style={styles.cardBody}>{body}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  )
}

function DetailHeader({ title, meta, onBack }: { title: string; meta: string; onBack: () => void }) {
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Return to list"
        onPress={onBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <Text style={styles.backText}>← BACK</Text>
      </Pressable>
      <Text style={styles.detailMeta}>{meta}</Text>
      <Text style={styles.detailTitle}>{title}</Text>
      <ReadOnlyBadge />
    </View>
  )
}

function DashboardView({ snapshot, media, select }: {
  snapshot: OfflineSnapshot
  media: OfflineMediaMap
  select: (tab: OfflineTab, detail: DetailSelection) => void
}) {
  const { width } = useWindowDimensions()
  const thumbnail = width < 360 ? styles.updateImageSmall : styles.updateImage
  const fallbackUpdates = [
    ...snapshot.intel.map(item => ({ id: `intel-${item.id}`, title: item.title, date: item.timestamp, category: 'Intel', image: item.images[0], tab: 'intel' as const, detail: { kind: 'intel' as const, id: item.id } })),
    ...snapshot.devices.map(item => ({ id: `device-${item.id}`, title: item.name, date: item.updated_at, category: 'Device update', image: item.image_path, tab: 'devices' as const, detail: { kind: 'device' as const, id: item.id } })),
    ...snapshot.votes.map(item => ({ id: `vote-${item.id}`, title: item.title, date: item.created_at, category: 'Vote opened', image: null, tab: 'intel' as const, detail: { kind: 'vote' as const, id: item.id } })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.id.localeCompare(b.id)).slice(0, 10)
  const updates = snapshot.dashboardUpdates ? snapshot.dashboardUpdates.map(item => {
    const match = item.href.match(/^\/(intel|worlds|devices)\/(?:batches\/)?([^/?]+)/)
    const tab: OfflineTab = item.href.startsWith('/worlds') ? 'worlds' : item.href.startsWith('/devices') ? 'devices' : item.href.startsWith('/voyagers') ? 'voyagers' : 'intel'
    const kind: DetailKind = tab === 'worlds' ? 'world' : tab === 'devices' ? 'device' : 'intel'
    const detail: DetailSelection = item.id.startsWith('vote-') ? {kind:'vote',id:item.id.slice(5)} : match ? {kind,id:decodeURIComponent(match[2])} : null
    return { ...item, date:item.occurredAt, tab, detail }
  }) : fallbackUpdates
  return <View>
    <SectionTitle>UPDATES</SectionTitle>
    <Text style={styles.meta}>Latest {updates.length} saved updates</Text>
    {updates.length ? updates.map(item => <View key={item.id} style={styles.updateRow}>
      <View style={styles.updateTime}><View style={styles.updateNode} /><Text style={styles.updateDate}>{item.date.slice(5, 10).replace('-', '/')}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={() => select(item.tab, item.detail)} style={styles.updateContent}>
        <CachedImage uri={item.image} media={media} style={thumbnail} />
        <View style={{ flex: 1 }}><Text style={styles.meta}>{item.category}</Text><Text style={styles.cardTitle}>{item.title}</Text></View>
      </Pressable>
    </View>) : <EmptyState>No updates were saved. Reconnect to load the latest activity.</EmptyState>}
    <SectionTitle>EVENTS</SectionTitle>
    <EmptyState>Reconnect to see events you can participate in. Availability and participation cannot be confirmed offline.</EmptyState>
  </View>
}

function IntelView({ snapshot, media, detail, setDetail }: {
  snapshot: OfflineSnapshot
  media: OfflineMediaMap
  detail: DetailSelection
  setDetail: (detail: DetailSelection) => void
}) {
  const [mode, setMode] = useState<IntelMode>('intel')
  const selectedIntel = detail?.kind === 'intel' ? snapshot.intel.find((item) => item.id === detail.id) : null
  const selectedVote = detail?.kind === 'vote' ? snapshot.votes.find((item) => item.id === detail.id) : null

  if (selectedIntel) return <IntelDetail item={selectedIntel} media={media} onBack={() => setDetail(null)} />
  if (selectedVote) return <VoteDetail item={selectedVote} onBack={() => setDetail(null)} />

  return (
    <View>
      <SegmentedControl
        options={[{ key: 'intel', label: 'INTEL' }, { key: 'votes', label: 'VOTES' }]}
        selected={mode}
        onSelect={(value) => setMode(value as IntelMode)}
      />
      {mode === 'intel' ? snapshot.intel.map((entry) => (
        <ListCard key={entry.id} title={entry.title} meta={`${entry.tag} · ${formatDate(entry.timestamp)}`}
          body={entry.content} image={entry.images[0]} media={media}
          onPress={() => setDetail({ kind: 'intel', id: entry.id })} />
      )) : snapshot.votes.map((vote) => (
        <ListCard key={vote.id} title={vote.title}
          meta={`${vote.is_active ? 'ACTIVE' : 'CLOSED'} · ${formatDate(vote.created_at)}`}
          body={vote.description} media={media}
          onPress={() => setDetail({ kind: 'vote', id: vote.id })} />
      ))}
    </View>
  )
}

function IntelDetail({ item, media, onBack }: { item: OfflineIntel; media: OfflineMediaMap; onBack: () => void }) {
  return (
    <View>
      <DetailHeader title={item.title} meta={`${item.tag} · ${formatDate(item.timestamp)}`} onBack={onBack} />
      {item.images.map((image) => <CachedImage key={image} uri={image} media={media} style={styles.detailImage} />)}
      <Text style={styles.byline}>PUBLISHED BY {item.publisher_name?.toUpperCase() ?? 'MULTIVERSE COLLECTIVE'}</Text>
      <Text style={styles.articleBody}>{item.content}</Text>
      <OfflineActionNotice label="Comments and read tracking require a connection." />
    </View>
  )
}

function VoteDetail({ item, onBack }: { item: OfflineVote; onBack: () => void }) {
  return (
    <View>
      <DetailHeader title={item.title} meta={`${item.is_active ? 'ACTIVE VOTE' : 'CLOSED'} · ${formatDate(item.created_at)}`} onBack={onBack} />
      {item.description ? <Text style={styles.articleBody}>{item.description}</Text> : null}
      <SectionTitle>OPTIONS</SectionTitle>
      {item.options.map((option, index) => (
        <View key={option.id} style={styles.optionRow}>
          <Text style={styles.optionIndex}>{String(index + 1).padStart(2, '0')}</Text>
          <Text style={styles.optionLabel}>{option.label}</Text>
        </View>
      ))}
      <OfflineActionNotice label="Voting is disabled offline. Reconnect before the vote closes to participate." />
    </View>
  )
}

function DevicesView({ snapshot, media, detail, setDetail }: {
  snapshot: OfflineSnapshot; media: OfflineMediaMap; detail: DetailSelection; setDetail: (detail: DetailSelection) => void
}) {
  const selected = detail?.kind === 'device' ? snapshot.devices.find((item) => item.id === detail.id) : null
  if (selected) return <DeviceDetail item={selected} media={media} onBack={() => setDetail(null)} />
  if (snapshot.devices.length === 0) return <EmptyState>No Device Archive snapshot is available.</EmptyState>
  return <View>{snapshot.devices.map((item) => (
    <ListCard key={item.id} title={item.name}
      meta={`${item.knowledge.toUpperCase()} · ${STATUS_LABEL[item.status ?? 'unknown'] ?? 'UNKNOWN'}`}
      body={item.description} image={item.image_path} media={media}
      onPress={() => setDetail({ kind: 'device', id: item.id })} />
  ))}</View>
}

function DeviceDetail({ item, media, onBack }: { item: OfflineDevice; media: OfflineMediaMap; onBack: () => void }) {
  return (
    <View>
      <DetailHeader title={item.name} meta={`${item.batch_id ?? 'DEVICE ARCHIVE'} · ${STATUS_LABEL[item.status ?? 'unknown'] ?? 'UNKNOWN'}`} onBack={onBack} />
      <CachedImage uri={item.image_path} media={media} style={styles.detailImage} />
      <DetailFact label="LOCATION" value={item.location} />
      <DetailFact label="KNOWLEDGE" value={item.knowledge.toUpperCase()} />
      {item.current_user_name ? <DetailFact label="CURRENT OPERATOR" value={item.current_user_name} /> : null}
      {item.knowledge === 'unknown' ? <DetailFact label="EXPLORATION" value={`${item.exploration_progress}%`} /> : null}
      <Text style={styles.articleBody}>{item.description}</Text>
      <OfflineActionNotice label="Device updates and comments require a connection." />
    </View>
  )
}

function WorldsView({ snapshot, media, detail, setDetail }: {
  snapshot: OfflineSnapshot; media: OfflineMediaMap; detail: DetailSelection; setDetail: (detail: DetailSelection) => void
}) {
  const selected = detail?.kind === 'world' ? snapshot.worlds.find((item) => item.id === detail.id) : null
  if (selected) return <WorldDetail item={selected} media={media} onBack={() => setDetail(null)} />
  const order: OfflineWorld['lifecycle_state'][] = ['proposed', 'syncing', 'picked', 'stable']
  return <View>{order.map((stage) => {
    const items = snapshot.worlds.filter((world) => world.lifecycle_state === stage)
    if (items.length === 0 || (stage === 'picked' && snapshot.worlds.some((world) => world.lifecycle_state === 'syncing'))) return null
    const merged = stage === 'syncing'
      ? snapshot.worlds.filter((world) => world.lifecycle_state === 'syncing' || world.lifecycle_state === 'picked')
      : items
    return (
      <View key={stage}>
        <SectionTitle action={<Text style={styles.sectionCount}>{merged.length}</Text>}>{STAGE_LABEL[stage]}</SectionTitle>
        {merged.map((item) => (
          <ListCard key={item.id} title={item.name_en || item.name} meta={`${item.id} · ${formatDate(item.discovery_date)}`}
            body={item.description} image={item.image_path} media={media}
            onPress={() => setDetail({ kind: 'world', id: item.id })} />
        ))}
      </View>
    )
  })}</View>
}

function WorldDetail({ item, media, onBack }: { item: OfflineWorld; media: OfflineMediaMap; onBack: () => void }) {
  return (
    <View>
      <DetailHeader title={item.name_en || item.name} meta={`${STAGE_LABEL[item.lifecycle_state]} · ${formatDate(item.discovery_date)}`} onBack={onBack} />
      <CachedImage uri={item.image_path} media={media} style={[styles.detailImage, { backgroundColor: item.gradient_from }]} />
      <DetailFact label="DISCOVERED" value={formatDate(item.discovery_date)} />
      <DetailFact label="DISCOVERER" value={item.discoverer_name || 'UNKNOWN'} />
      <Text style={styles.articleBody}>{item.description}</Text>
      <OfflineActionNotice label="Signal Dispatch, submissions, and comments require a connection." />
    </View>
  )
}

function VoyagersView({ snapshot, media, detail, setDetail, mode, setMode }: {
  snapshot: OfflineSnapshot; media: OfflineMediaMap; detail: DetailSelection; setDetail: (detail: DetailSelection) => void; mode: VoyagerMode; setMode: (mode: VoyagerMode) => void
}) {
  const voyager = detail?.kind === 'voyager' ? snapshot.voyagers.find((item) => item.id === detail.id) : null
  const story = detail?.kind === 'story' ? snapshot.stories.find((item) => item.id === detail.id) : null
  if (voyager) return <VoyagerDetail item={voyager} media={media} onBack={() => setDetail(null)} />
  if (story) return <StoryDetail item={story} media={media} onBack={() => setDetail(null)} />
  return (
    <View>
      <SegmentedControl
        options={[{ key: 'voyagers', label: 'VOYAGERS' }, { key: 'logs', label: 'LOGS' }]}
        selected={mode}
        onSelect={(value) => setMode(value as VoyagerMode)}
      />
      {mode === 'voyagers' ? snapshot.voyagers.map((item) => (
        <ListCard key={item.id} title={item.display_name}
          meta={`${item.role.toUpperCase()} · ${item.batch_label.toUpperCase()}`}
          body={item.bio} image={item.avatar_url} media={media}
          onPress={() => setDetail({ kind: 'voyager', id: item.id })} />
      )) : snapshot.stories.map((item) => (
        <ListCard key={item.id} title={item.title} meta={`${item.author_name.toUpperCase()} · ${formatDate(item.date)}`}
          body={item.excerpt} image={item.youtube_id ? `https://img.youtube.com/vi/${item.youtube_id}/hqdefault.jpg` : undefined}
          media={media} onPress={() => setDetail({ kind: 'story', id: item.id })} />
      ))}
    </View>
  )
}

function VoyagerDetail({ item, media, onBack }: { item: OfflineVoyager; media: OfflineMediaMap; onBack: () => void }) {
  return (
    <View>
      <DetailHeader title={item.display_name} meta={`${item.role.toUpperCase()} · ${item.batch_label.toUpperCase()}`} onBack={onBack} />
      <View style={styles.profileHero}>
        {item.avatar_url ? <CachedImage uri={item.avatar_url} media={media} style={styles.avatarLarge} /> : (
          <View style={[styles.avatarLarge, styles.avatarFallback]}><Text style={styles.avatarInitials}>{initials(item.display_name)}</Text></View>
        )}
        <View style={styles.profileStats}>
          <DetailFact label="OBSERVATION DAYS" value={String(item.observation_days)} />
          <DetailFact label="WORLDS DISCOVERED" value={String(item.worlds_discovered)} />
        </View>
      </View>
      {item.bio ? <Text style={styles.articleBody}>{item.bio}</Text> : null}
      <OfflineActionNotice label="Profile editing and external social links require a connection." />
    </View>
  )
}

function StoryDetail({ item, media, onBack }: { item: OfflineStory; media: OfflineMediaMap; onBack: () => void }) {
  const thumbnail = item.youtube_id ? `https://img.youtube.com/vi/${item.youtube_id}/hqdefault.jpg` : null
  return (
    <View>
      <DetailHeader title={item.title} meta={`${item.author_name.toUpperCase()} · ${formatDate(item.date)}`} onBack={onBack} />
      {thumbnail ? <CachedImage uri={thumbnail} media={media} style={styles.detailImage} /> : null}
      <Text style={styles.articleBody}>{item.content}</Text>
      <OfflineActionNotice label="Video playback and transmissions require a connection." />
    </View>
  )
}

function SegmentedControl({ options, selected, onSelect }: {
  options: { key: string; label: string }[]; selected: string; onSelect: (value: string) => void
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => (
        <Pressable key={option.key} accessibilityRole="button" onPress={() => onSelect(option.key)}
          style={[styles.segment, selected === option.key && styles.segmentActive]}>
          <Text style={[styles.segmentText, selected === option.key && styles.segmentTextActive]}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

function DetailFact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.factRow}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  )
}

function OfflineActionNotice({ label }: { label: string }) {
  return (
    <View style={styles.actionNotice}>
      <Text style={styles.actionNoticeTitle}>CONNECTION REQUIRED</Text>
      <Text style={styles.actionNoticeBody}>{label}</Text>
    </View>
  )
}

export function OfflineHome({ connected, reconnecting, snapshot, media, onRetry }: OfflineHomeProps) {
  const [activeTab, setActiveTab] = useState<OfflineTab>('dashboard')
  const [voyagerMode, setVoyagerMode] = useState<VoyagerMode>('voyagers')
  const isLogs = activeTab === 'voyagers' && voyagerMode === 'logs'
  const scrollView = useRef<ScrollView>(null)
  const positions = useRef<Record<string, number>>({})
  const [detail, updateDetail] = useState<DetailSelection>(null)
  const returnTab = useRef<OfflineTab | null>(null)
  const setDetail = (next: DetailSelection) => { if (!next && returnTab.current) { setActiveTab(returnTab.current); returnTab.current = null }; updateDetail(next) }
  const scrollKey = detail ? `${activeTab}:${detail.kind}:${detail.id}` : isLogs ? 'logs' : activeTab
  useEffect(() => { const timer = setTimeout(() => scrollView.current?.scrollTo({ y: positions.current[scrollKey] ?? 0, animated: false }), 0); return () => clearTimeout(timer) }, [scrollKey])
  const activeLabel = useMemo(() => TABS.find((tab) => tab.key === activeTab)?.label ?? 'DASHBOARD', [activeTab])
  const detailCollections = snapshot ? { intel: snapshot.intel, device: snapshot.devices, world: snapshot.worlds, voyager: snapshot.voyagers, story: snapshot.stories, vote: snapshot.votes } : null
  const missingDetail = !!detail && !!detailCollections && !detailCollections[detail.kind].some(item => item.id === detail.id)

  const select = (tab: OfflineTab, nextDetail: DetailSelection) => {
    returnTab.current = activeTab
    setActiveTab(tab)
    updateDetail(nextDetail)
  }

  const changeTab = (tab: OfflineTab) => {
    if (tab === 'voyagers') setVoyagerMode('voyagers')
    if (activeTab === tab && !detail) return
    returnTab.current = null
    setActiveTab(tab)
    updateDetail(null)
  }

  return (
    <View accessibilityRole="summary" style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <View>
            {!detail && !isLogs && <View style={styles.brandRow}><Image source={require('./assets/vi-icon.png')} resizeMode="contain" style={{ width: 40, height: 40 }} /><Image source={require('./assets/vi-wordmark.png')} resizeMode="contain" style={{ width: 160, height: 44 }} /></View>}
            {!detail && isLogs && <Pressable accessibilityRole="button" accessibilityLabel="Back to Voyagers" style={styles.backButton} onPress={() => setVoyagerMode('voyagers')}><Text style={styles.backText}>← VOYAGERS</Text></Pressable>}
            {!detail && <Text style={styles.pageTitle}>{isLogs ? 'VOYAGER LOGS' : activeLabel}</Text>}
          </View>
          <View style={styles.signalGroup}>
            <View style={[styles.statusDot, connected && styles.statusDotOnline]} />
            <Text style={styles.signalText}>{connected ? 'SIGNAL FOUND' : 'OFFLINE'}</Text>
          </View>
        </View>

        {snapshot ? (
          <>
            <View style={styles.syncBar}>
              <Text style={styles.syncText}>LAST SYNCED {formatDate(snapshot.syncedAt, true)}</Text>
              <Pressable accessibilityRole="button" disabled={reconnecting} onPress={onRetry}
                style={({ pressed }) => [styles.retrySmall, pressed && styles.pressed]}>
                <Text style={styles.retrySmallText}>{reconnecting ? 'CONNECTING…' : 'RETRY'}</Text>
              </Pressable>
            </View>
            <ScrollView ref={scrollView} onScroll={event => { positions.current[scrollKey] = event.nativeEvent.contentOffset.y }} scrollEventThrottle={100} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              {missingDetail && <View><DetailHeader title="Not saved on this device" meta="OFFLINE" onBack={() => setDetail(null)} /><EmptyState>Reconnect to load this record, or return to your saved list.</EmptyState></View>}
              {!missingDetail && activeTab === 'dashboard' && <DashboardView snapshot={snapshot} media={media} select={select} />}
              {!missingDetail && activeTab === 'intel' && <IntelView snapshot={snapshot} media={media} detail={detail} setDetail={setDetail} />}
              {!missingDetail && activeTab === 'devices' && <DevicesView snapshot={snapshot} media={media} detail={detail} setDetail={setDetail} />}
              {!missingDetail && activeTab === 'worlds' && <WorldsView snapshot={snapshot} media={media} detail={detail} setDetail={setDetail} />}
              {!missingDetail && activeTab === 'voyagers' && <VoyagersView snapshot={snapshot} media={media} detail={detail} setDetail={setDetail} mode={voyagerMode} setMode={setVoyagerMode} />}
            </ScrollView>

          </>
        ) : (
          <View style={styles.noSnapshot}>
            <Text style={styles.noSnapshotTitle}>NO OFFLINE COPY YET</Text>
            <Text style={styles.noSnapshotBody}>Connect once to save the Multiverse Console and its latest content on this device.</Text>
            <Pressable accessibilityRole="button" disabled={reconnecting} onPress={onRetry}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
              <Text style={styles.retryButtonText}>{reconnecting ? 'CONNECTING…' : 'RETRY CONNECTION'}</Text>
            </Pressable>
          </View>
        )}
            <View style={styles.bottomNav}>
              {TABS.map((tab) => (
                <Pressable key={tab.key} accessibilityRole="button" accessibilityLabel={tab.label} accessibilityState={{ selected: activeTab === tab.key }}
                  onPress={() => changeTab(tab.key)} style={styles.navItem}>
                  <View style={[styles.navMarker, activeTab !== tab.key && { opacity: 0 }]} /><Image source={tab.icon} style={{ width: 22, height: 22, tintColor: activeTab === tab.key ? ORANGE : DIM }} />
                  <Text style={[styles.navLabel, activeTab === tab.key && styles.navActive]}>{tab.label}</Text>
                </Pressable>
              ))}
            </View>
      </SafeAreaView>
    </View>
  )
}

const ORANGE = '#E35205'
const BURNT = '#C84406'
const DEEP = '#080C20'
const PANEL = '#10162D'
const CARD = '#10162D'
const WHITE = '#F5F5F5'
const DIM = 'rgba(245,245,245,0.72)'
const DEEP_TEXT = 'rgba(245,245,245,0.65)'
const BORDER = 'rgba(245,245,245,0.10)'

const styles = StyleSheet.create({
  brandRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pageTitle: { minHeight: 44, color: WHITE, fontFamily: 'CourierPrimeBold', fontSize: 24, fontWeight: '700' },
  navMarker: { position: 'absolute', top: 0, width: 24, height: 2, backgroundColor: ORANGE },
  updateRow: { flexDirection: 'row', gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  updateTime: { width: 36, borderLeftWidth: 1, borderLeftColor: 'rgba(227,82,5,0.62)' },
  updateNode: { width: 7, height: 7, borderRadius: 4, backgroundColor: ORANGE, marginLeft: -4, marginBottom: 8 },
  updateDate: { width: 36, color: DIM, fontFamily: 'CourierPrime', fontSize: 12 },
  updateContent: { flex: 1, flexDirection: 'row', gap: 12 },
  updateImage: { width: 120, height: 80 },
  updateImageSmall: { width: 96, height: 64 },
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: DEEP },
  safeArea: { flex: 1, backgroundColor: DEEP },
  topBar: { minHeight: 62, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: BORDER },
  topBrand: { color: ORANGE, fontFamily: 'CourierPrimeBold', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  topRoute: { marginTop: 4, color: DEEP_TEXT, fontFamily: 'CourierPrime', fontSize: 12 },
  signalGroup: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, marginRight: 7, borderRadius: 4, backgroundColor: ORANGE },
  statusDotOnline: { backgroundColor: '#20D890' },
  signalText: { color: DIM, fontFamily: 'CourierPrimeBold', fontSize: 12, fontWeight: '700' },
  syncBar: { minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: PANEL, borderBottomWidth: 1, borderBottomColor: BORDER },
  syncText: { color: DEEP_TEXT, fontFamily: 'CourierPrime', fontSize: 12 },
  retrySmall: { minWidth: 64, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  retrySmallText: { color: ORANGE, fontFamily: 'CourierPrimeBold', fontSize: 12, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 32 },
  heroPanel: { padding: 20, borderWidth: 1, borderColor: 'rgba(227,82,5,0.62)', backgroundColor: PANEL },
  eyebrow: { color: ORANGE, fontFamily: 'CourierPrimeBold', fontSize: 12, fontWeight: '700', letterSpacing: 1.4 },
  heroTitle: { marginTop: 14, color: WHITE, fontFamily: 'CourierPrimeBold', fontSize: 24, lineHeight: 29, fontWeight: '700' },
  heroBody: { marginTop: 12, color: DIM, fontFamily: 'CourierPrime', fontSize: 14, lineHeight: 21 },
  statGrid: { flexDirection: 'row', marginTop: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  stat: { flex: 1, minHeight: 74, alignItems: 'center', justifyContent: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: BORDER },
  statValue: { color: WHITE, fontFamily: 'CourierPrimeBold', fontSize: 22, fontWeight: '700' },
  statLabel: { marginTop: 4, color: DEEP_TEXT, fontFamily: 'CourierPrime', fontSize: 12 },
  sectionHeader: { minHeight: 48, marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(227,82,5,0.24)' },
  sectionTitle: { color: WHITE, fontFamily: 'CourierPrimeBold', fontSize: 20, fontWeight: '700', letterSpacing: 1.2 },
  sectionCount: { color: DEEP_TEXT, fontFamily: 'CourierPrime', fontSize: 12 },
  listCard: { minHeight: 96, marginTop: 10, flexDirection: 'row', alignItems: 'stretch', borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  listCardCopy: { flex: 1, padding: 14 },
  cardImage: { width: 92, minHeight: 94, backgroundColor: PANEL },
  imagePlaceholder: { borderRightWidth: 1, borderRightColor: BORDER },
  meta: { color: ORANGE, fontFamily: 'CourierPrimeBold', fontSize: 12, fontWeight: '700' },
  cardTitle: { marginTop: 6, color: WHITE, fontFamily: 'CourierPrimeBold', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  cardBody: { marginTop: 7, color: DIM, fontFamily: 'CourierPrime', fontSize: 13, lineHeight: 18 },
  chevron: { alignSelf: 'center', paddingRight: 12, color: ORANGE, fontFamily: 'CourierPrime', fontSize: 28 },
  emptyState: { marginTop: 10, padding: 18, borderWidth: 1, borderColor: BORDER, backgroundColor: PANEL },
  emptyText: { color: DIM, fontFamily: 'CourierPrime', fontSize: 13, lineHeight: 19 },
  readOnly: { alignSelf: 'flex-start', marginTop: 14, paddingHorizontal: 9, paddingVertical: 5, color: ORANGE, fontFamily: 'CourierPrimeBold', fontSize: 12, fontWeight: '700', borderWidth: 1, borderColor: 'rgba(227,82,5,0.48)' },
  functionPanel: { borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  functionRow: { minHeight: 50, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  functionName: { flex: 1, color: WHITE, fontFamily: 'CourierPrime', fontSize: 13 },
  functionStatus: { color: DEEP_TEXT, fontFamily: 'CourierPrime', fontSize: 12 },
  segmented: { flexDirection: 'row', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  segment: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { borderBottomWidth: 2, borderBottomColor: ORANGE },
  segmentText: { color: DIM, fontFamily: 'CourierPrimeBold', fontSize: 13, fontWeight: '700' },
  segmentTextActive: { color: ORANGE },
  backButton: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingRight: 20 },
  backText: { color: ORANGE, fontFamily: 'CourierPrimeBold', fontSize: 13, fontWeight: '700' },
  detailMeta: { marginTop: 8, color: ORANGE, fontFamily: 'CourierPrimeBold', fontSize: 12, fontWeight: '700' },
  detailTitle: { marginTop: 10, color: WHITE, fontFamily: 'CourierPrimeBold', fontSize: 24, lineHeight: 30, fontWeight: '700' },
  detailImage: { width: '100%', height: 220, marginTop: 20, backgroundColor: PANEL },
  byline: { marginTop: 18, color: DEEP_TEXT, fontFamily: 'CourierPrime', fontSize: 12 },
  articleBody: { marginTop: 20, color: DIM, fontFamily: 'CourierPrime', fontSize: 16, lineHeight: 24 },
  factRow: { minHeight: 52, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  factLabel: { flex: 1, color: DEEP_TEXT, fontFamily: 'CourierPrime', fontSize: 12 },
  factValue: { flex: 1, color: WHITE, fontFamily: 'CourierPrime', fontSize: 13, textAlign: 'right' },
  optionRow: { minHeight: 58, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER, backgroundColor: CARD, marginBottom: 8 },
  optionIndex: { width: 38, color: ORANGE, fontFamily: 'CourierPrime', fontSize: 13 },
  optionLabel: { flex: 1, color: WHITE, fontFamily: 'CourierPrime', fontSize: 14 },
  actionNotice: { marginTop: 26, padding: 16, borderWidth: 1, borderColor: 'rgba(227,82,5,0.48)', backgroundColor: PANEL },
  actionNoticeTitle: { color: ORANGE, fontFamily: 'CourierPrimeBold', fontSize: 12, fontWeight: '700' },
  actionNoticeBody: { marginTop: 8, color: DIM, fontFamily: 'CourierPrime', fontSize: 13, lineHeight: 19 },
  profileHero: { marginTop: 20, flexDirection: 'row', gap: 16 },
  avatarLarge: { width: 104, height: 104, backgroundColor: PANEL },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(227,82,5,0.48)' },
  avatarInitials: { color: ORANGE, fontFamily: 'CourierPrimeBold', fontSize: 26, fontWeight: '700' },
  profileStats: { flex: 1 },
  bottomNav: { minHeight: 72, flexDirection: 'row', borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: PANEL },
  navItem: { flex: 1, minHeight: 72, alignItems: 'center', justifyContent: 'center' },
  navIcon: { color: DIM, fontFamily: 'CourierPrime', fontSize: 18 },
  navLabel: { marginTop: 4, color: DEEP_TEXT, fontFamily: 'CourierPrime', fontSize: 12, letterSpacing: -0.7 },
  navActive: { color: ORANGE },
  noSnapshot: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center' },
  noSnapshotTitle: { color: WHITE, fontFamily: 'CourierPrimeBold', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  noSnapshotBody: { maxWidth: 340, marginTop: 16, color: DIM, fontFamily: 'CourierPrime', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  retryButton: { minWidth: 220, minHeight: 52, marginTop: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: ORANGE },
  retryButtonText: { color: DEEP, fontFamily: 'CourierPrimeBold', fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.72 },
})
