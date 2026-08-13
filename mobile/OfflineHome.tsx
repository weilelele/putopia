import { useMemo, useState } from 'react'
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
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

const TABS: { key: OfflineTab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'DASHBOARD', icon: '◎' },
  { key: 'intel', label: 'INTEL', icon: '⌁' },
  { key: 'devices', label: 'DEVICES', icon: '▣' },
  { key: 'worlds', label: 'WORLDS', icon: '◉' },
  { key: 'voyagers', label: 'VOYAGERS', icon: '◇' },
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
  return media[remote] ?? remote
}

function CachedImage({ uri, media, style = styles.cardImage }: {
  uri: string | null | undefined
  media: OfflineMediaMap
  style?: object
}) {
  const source = mediaUri(uri, media)
  if (!source) return <View style={[style, styles.imagePlaceholder]} />
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
  const established = snapshot.worlds.filter((world) => world.lifecycle_state === 'stable')
  const activeVotes = snapshot.votes.filter((vote) => vote.is_active)
  return (
    <View>
      <View style={styles.heroPanel}>
        <Text style={styles.eyebrow}>MULTIVERSE COLLECTIVE</Text>
        <Text style={styles.heroTitle}>WELCOME BACK{snapshot.viewer.displayName ? `,\n${snapshot.viewer.displayName.toUpperCase()}` : ''}</Text>
        <Text style={styles.heroBody}>Your last synchronized Console is available without a network connection.</Text>
      </View>

      <View style={styles.statGrid}>
        <View style={styles.stat}><Text style={styles.statValue}>{snapshot.intel.length}</Text><Text style={styles.statLabel}>INTEL</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{snapshot.devices.length}</Text><Text style={styles.statLabel}>DEVICES</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{established.length}</Text><Text style={styles.statLabel}>WORLDS</Text></View>
      </View>

      <SectionTitle action={<Text style={styles.sectionCount}>{snapshot.intel.length} SAVED</Text>}>LATEST INTEL</SectionTitle>
      {snapshot.intel.slice(0, 3).map((entry) => (
        <ListCard key={entry.id} title={entry.title} meta={`${entry.tag} · ${formatDate(entry.timestamp)}`}
          body={entry.content} image={entry.images[0]} media={media}
          onPress={() => select('intel', { kind: 'intel', id: entry.id })} />
      ))}

      <SectionTitle action={<Text style={styles.sectionCount}>{activeVotes.length} ACTIVE</Text>}>VOTING HUB</SectionTitle>
      {activeVotes.length === 0 ? <EmptyState>No active votes were saved.</EmptyState> : activeVotes.slice(0, 3).map((vote) => (
        <ListCard key={vote.id} title={vote.title} meta={vote.ends_at ? `ENDS ${formatDate(vote.ends_at)}` : 'OPEN'}
          body={vote.description} media={media}
          onPress={() => select('intel', { kind: 'vote', id: vote.id })} />
      ))}

      <SectionTitle>CONSOLE FUNCTIONS</SectionTitle>
      <View style={styles.functionPanel}>
        {snapshot.functions.map((item) => (
          <View key={item.id} style={styles.functionRow}>
            <View style={[styles.statusDot, item.status === 'active' && styles.statusDotOnline]} />
            <Text style={styles.functionName}>{item.name}</Text>
            <Text style={styles.functionStatus}>{item.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
        ))}
      </View>
    </View>
  )
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

function VoyagersView({ snapshot, media, detail, setDetail }: {
  snapshot: OfflineSnapshot; media: OfflineMediaMap; detail: DetailSelection; setDetail: (detail: DetailSelection) => void
}) {
  const [mode, setMode] = useState<VoyagerMode>('voyagers')
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
  const [detail, setDetail] = useState<DetailSelection>(null)
  const activeLabel = useMemo(() => TABS.find((tab) => tab.key === activeTab)?.label ?? 'DASHBOARD', [activeTab])

  const select = (tab: OfflineTab, nextDetail: DetailSelection) => {
    setActiveTab(tab)
    setDetail(nextDetail)
  }

  const changeTab = (tab: OfflineTab) => {
    setActiveTab(tab)
    setDetail(null)
  }

  return (
    <View accessibilityRole="summary" style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.topBrand}>MULTIVERSE COLLECTIVE</Text>
            <Text style={styles.topRoute}>CONSOLE / {activeLabel}</Text>
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
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              {activeTab === 'dashboard' && <DashboardView snapshot={snapshot} media={media} select={select} />}
              {activeTab === 'intel' && <IntelView snapshot={snapshot} media={media} detail={detail} setDetail={setDetail} />}
              {activeTab === 'devices' && <DevicesView snapshot={snapshot} media={media} detail={detail} setDetail={setDetail} />}
              {activeTab === 'worlds' && <WorldsView snapshot={snapshot} media={media} detail={detail} setDetail={setDetail} />}
              {activeTab === 'voyagers' && <VoyagersView snapshot={snapshot} media={media} detail={detail} setDetail={setDetail} />}
            </ScrollView>
            <View style={styles.bottomNav}>
              {TABS.map((tab) => (
                <Pressable key={tab.key} accessibilityRole="button" accessibilityLabel={tab.label}
                  onPress={() => changeTab(tab.key)} style={styles.navItem}>
                  <Text style={[styles.navIcon, activeTab === tab.key && styles.navActive]}>{tab.icon}</Text>
                  <Text style={[styles.navLabel, activeTab === tab.key && styles.navActive]}>{tab.label}</Text>
                </Pressable>
              ))}
            </View>
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
      </SafeAreaView>
    </View>
  )
}

const ORANGE = '#E35205'
const BURNT = '#C84406'
const DEEP = '#080C20'
const PANEL = '#10162D'
const CARD = '#121A35'
const WHITE = '#F5F5F5'
const DIM = 'rgba(245,245,245,0.55)'
const DEEP_TEXT = 'rgba(245,245,245,0.35)'
const BORDER = 'rgba(245,245,245,0.10)'

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: DEEP },
  safeArea: { flex: 1, backgroundColor: DEEP },
  topBar: { minHeight: 62, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: BORDER },
  topBrand: { color: ORANGE, fontFamily: 'Courier', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  topRoute: { marginTop: 4, color: DEEP_TEXT, fontFamily: 'Courier', fontSize: 12 },
  signalGroup: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, marginRight: 7, borderRadius: 4, backgroundColor: ORANGE },
  statusDotOnline: { backgroundColor: '#20D890' },
  signalText: { color: DIM, fontFamily: 'Courier', fontSize: 12, fontWeight: '700' },
  syncBar: { minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: PANEL, borderBottomWidth: 1, borderBottomColor: BORDER },
  syncText: { color: DEEP_TEXT, fontFamily: 'Courier', fontSize: 12 },
  retrySmall: { minWidth: 64, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  retrySmallText: { color: ORANGE, fontFamily: 'Courier', fontSize: 12, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 32 },
  heroPanel: { padding: 20, borderWidth: 1, borderColor: 'rgba(227,82,5,0.62)', backgroundColor: PANEL },
  eyebrow: { color: ORANGE, fontFamily: 'Courier', fontSize: 12, fontWeight: '700', letterSpacing: 1.4 },
  heroTitle: { marginTop: 14, color: WHITE, fontFamily: 'Courier', fontSize: 24, lineHeight: 29, fontWeight: '700' },
  heroBody: { marginTop: 12, color: DIM, fontFamily: 'Courier', fontSize: 14, lineHeight: 21 },
  statGrid: { flexDirection: 'row', marginTop: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  stat: { flex: 1, minHeight: 74, alignItems: 'center', justifyContent: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: BORDER },
  statValue: { color: WHITE, fontFamily: 'Courier', fontSize: 22, fontWeight: '700' },
  statLabel: { marginTop: 4, color: DEEP_TEXT, fontFamily: 'Courier', fontSize: 12 },
  sectionHeader: { minHeight: 48, marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(227,82,5,0.24)' },
  sectionTitle: { color: ORANGE, fontFamily: 'Courier', fontSize: 13, fontWeight: '700', letterSpacing: 1.2 },
  sectionCount: { color: DEEP_TEXT, fontFamily: 'Courier', fontSize: 12 },
  listCard: { minHeight: 96, marginTop: 10, flexDirection: 'row', alignItems: 'stretch', borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  listCardCopy: { flex: 1, padding: 14 },
  cardImage: { width: 92, minHeight: 94, backgroundColor: PANEL },
  imagePlaceholder: { borderRightWidth: 1, borderRightColor: BORDER },
  meta: { color: ORANGE, fontFamily: 'Courier', fontSize: 12, fontWeight: '700' },
  cardTitle: { marginTop: 6, color: WHITE, fontFamily: 'Courier', fontSize: 15, lineHeight: 19, fontWeight: '700' },
  cardBody: { marginTop: 7, color: DIM, fontFamily: 'Courier', fontSize: 13, lineHeight: 18 },
  chevron: { alignSelf: 'center', paddingRight: 12, color: ORANGE, fontFamily: 'Courier', fontSize: 28 },
  emptyState: { marginTop: 10, padding: 18, borderWidth: 1, borderColor: BORDER, backgroundColor: PANEL },
  emptyText: { color: DIM, fontFamily: 'Courier', fontSize: 13, lineHeight: 19 },
  readOnly: { alignSelf: 'flex-start', marginTop: 14, paddingHorizontal: 9, paddingVertical: 5, color: ORANGE, fontFamily: 'Courier', fontSize: 12, fontWeight: '700', borderWidth: 1, borderColor: 'rgba(227,82,5,0.48)' },
  functionPanel: { borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  functionRow: { minHeight: 50, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  functionName: { flex: 1, color: WHITE, fontFamily: 'Courier', fontSize: 13 },
  functionStatus: { color: DEEP_TEXT, fontFamily: 'Courier', fontSize: 12 },
  segmented: { flexDirection: 'row', marginBottom: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: PANEL },
  segment: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: ORANGE },
  segmentText: { color: DIM, fontFamily: 'Courier', fontSize: 13, fontWeight: '700' },
  segmentTextActive: { color: DEEP },
  backButton: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingRight: 20 },
  backText: { color: ORANGE, fontFamily: 'Courier', fontSize: 13, fontWeight: '700' },
  detailMeta: { marginTop: 8, color: ORANGE, fontFamily: 'Courier', fontSize: 12, fontWeight: '700' },
  detailTitle: { marginTop: 10, color: WHITE, fontFamily: 'Courier', fontSize: 25, lineHeight: 31, fontWeight: '700' },
  detailImage: { width: '100%', height: 220, marginTop: 20, backgroundColor: PANEL },
  byline: { marginTop: 18, color: DEEP_TEXT, fontFamily: 'Courier', fontSize: 12 },
  articleBody: { marginTop: 20, color: DIM, fontFamily: 'Courier', fontSize: 15, lineHeight: 24 },
  factRow: { minHeight: 52, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  factLabel: { flex: 1, color: DEEP_TEXT, fontFamily: 'Courier', fontSize: 12 },
  factValue: { flex: 1, color: WHITE, fontFamily: 'Courier', fontSize: 13, textAlign: 'right' },
  optionRow: { minHeight: 58, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER, backgroundColor: CARD, marginBottom: 8 },
  optionIndex: { width: 38, color: ORANGE, fontFamily: 'Courier', fontSize: 13 },
  optionLabel: { flex: 1, color: WHITE, fontFamily: 'Courier', fontSize: 14 },
  actionNotice: { marginTop: 26, padding: 16, borderWidth: 1, borderColor: 'rgba(227,82,5,0.48)', backgroundColor: PANEL },
  actionNoticeTitle: { color: ORANGE, fontFamily: 'Courier', fontSize: 12, fontWeight: '700' },
  actionNoticeBody: { marginTop: 8, color: DIM, fontFamily: 'Courier', fontSize: 13, lineHeight: 19 },
  profileHero: { marginTop: 20, flexDirection: 'row', gap: 16 },
  avatarLarge: { width: 104, height: 104, backgroundColor: PANEL },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(227,82,5,0.48)' },
  avatarInitials: { color: ORANGE, fontFamily: 'Courier', fontSize: 26, fontWeight: '700' },
  profileStats: { flex: 1 },
  bottomNav: { minHeight: 70, flexDirection: 'row', borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: PANEL },
  navItem: { flex: 1, minHeight: 70, alignItems: 'center', justifyContent: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: BORDER },
  navIcon: { color: DIM, fontFamily: 'Courier', fontSize: 18 },
  navLabel: { marginTop: 4, color: DEEP_TEXT, fontFamily: 'Courier', fontSize: 12, letterSpacing: -0.7 },
  navActive: { color: ORANGE },
  noSnapshot: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center' },
  noSnapshotTitle: { color: WHITE, fontFamily: 'Courier', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  noSnapshotBody: { maxWidth: 340, marginTop: 16, color: DIM, fontFamily: 'Courier', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  retryButton: { minWidth: 220, minHeight: 52, marginTop: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: ORANGE },
  retryButtonText: { color: DEEP, fontFamily: 'Courier', fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.72 },
})
