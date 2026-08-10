import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { DEFAULT_OFFLINE_CHANNELS, type OfflineVisit } from './offline'

interface OfflineHomeProps {
  connected: boolean
  reconnecting: boolean
  recentVisits: OfflineVisit[]
  onRetry: () => void
}

function formatVisitTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'LAST SESSION'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).toUpperCase()
}

export function OfflineHome({
  connected,
  reconnecting,
  recentVisits,
  onRetry,
}: OfflineHomeProps) {
  return (
    <View accessibilityRole="summary" style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topline}>
          <Text style={styles.eyebrow}>PC://OFFLINE</Text>
          <View style={[styles.statusDot, connected && styles.statusDotOnline]} />
          <Text style={styles.status}>{connected ? 'SIGNAL FOUND' : 'NO SIGNAL'}</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.brand}>MULTIVERSE{`\n`}COLLECTIVE</Text>
          <View style={styles.orbitRow} accessibilityElementsHidden>
            <View style={styles.pillar} />
            <View style={styles.orbitOuter}>
              <View style={styles.orbitInner} />
            </View>
            <View style={styles.pillar} />
          </View>
          <Text style={styles.title}>SIGNAL INTERRUPTED</Text>
          <Text style={styles.body}>
            The Console is temporarily offline. This field archive remains available while we search for the uplink.
          </Text>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeCode}>PRIVACY LOCK ACTIVE</Text>
          <Text style={styles.noticeBody}>
            Account details, private records, and member activity are never stored in this offline view.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.rule} />
          <Text style={styles.sectionTitle}>FIELD MANUAL</Text>
          <View style={styles.rule} />
        </View>

        {DEFAULT_OFFLINE_CHANNELS.map((channel, index) => (
          <View key={channel.route} style={styles.card}>
            <Text style={styles.cardIndex}>0{index + 1}</Text>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{channel.label}</Text>
              <Text style={styles.cardBody}>{channel.description}</Text>
            </View>
            <Text style={styles.lock}>⌁</Text>
          </View>
        ))}

        {recentVisits.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.rule} />
              <Text style={styles.sectionTitle}>LAST KNOWN CHANNELS</Text>
              <View style={styles.rule} />
            </View>
            <View style={styles.recentPanel}>
              {recentVisits.map((visit) => (
                <View key={visit.route} style={styles.recentRow}>
                  <View>
                    <Text style={styles.recentTitle}>{visit.label}</Text>
                    <Text style={styles.recentTime}>{formatVisitTime(visit.visitedAt)}</Text>
                  </View>
                  <Text style={styles.readOnly}>READ ONLY</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reconnect to the Multiverse Console"
          disabled={reconnecting}
          onPress={onRetry}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
            reconnecting && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>
            {reconnecting ? 'RECONNECTING…' : connected ? 'OPEN CONSOLE' : 'SEARCH FOR SIGNAL'}
          </Text>
        </Pressable>
        <Text style={styles.footer}>BUILDING BETTER WORLDS, TOGETHER.</Text>
      </ScrollView>
    </View>
  )
}

const ORANGE = '#F15A24'
const NAVY = '#070912'
const PANEL = '#0D1229'

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: NAVY,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 42,
  },
  topline: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(241,90,36,0.3)',
  },
  eyebrow: {
    flex: 1,
    color: 'rgba(245,245,245,0.45)',
    fontFamily: 'Courier',
    fontSize: 10,
    letterSpacing: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    marginRight: 7,
    borderRadius: 4,
    backgroundColor: ORANGE,
  },
  statusDotOnline: { backgroundColor: '#53D6A0' },
  status: {
    color: 'rgba(245,245,245,0.65)',
    fontFamily: 'Courier',
    fontSize: 9,
    letterSpacing: 1.4,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 38,
  },
  brand: {
    color: ORANGE,
    fontFamily: 'Courier',
    fontSize: 31,
    fontWeight: '700',
    lineHeight: 30,
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  orbitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 22,
  },
  pillar: {
    width: 12,
    height: 30,
    borderRadius: 8,
    backgroundColor: ORANGE,
  },
  orbitOuter: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: ORANGE,
    borderRadius: 21,
  },
  orbitInner: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderColor: ORANGE,
    borderRadius: 15,
  },
  title: {
    color: '#F5F5F5',
    fontFamily: 'Courier',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 2,
  },
  body: {
    maxWidth: 330,
    marginTop: 14,
    color: 'rgba(245,245,245,0.62)',
    fontFamily: 'Courier',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  notice: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(83,214,160,0.35)',
    backgroundColor: 'rgba(83,214,160,0.06)',
  },
  noticeCode: {
    color: '#53D6A0',
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  noticeBody: {
    marginTop: 7,
    color: 'rgba(245,245,245,0.58)',
    fontFamily: 'Courier',
    fontSize: 11,
    lineHeight: 17,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 30,
    marginBottom: 13,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(241,90,36,0.24)',
  },
  sectionTitle: {
    color: ORANGE,
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  card: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: 'rgba(245,245,245,0.12)',
    backgroundColor: PANEL,
  },
  cardIndex: {
    width: 34,
    color: 'rgba(241,90,36,0.6)',
    fontFamily: 'Courier',
    fontSize: 11,
  },
  cardCopy: { flex: 1 },
  cardTitle: {
    color: '#F5F5F5',
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  cardBody: {
    marginTop: 6,
    color: 'rgba(245,245,245,0.48)',
    fontFamily: 'Courier',
    fontSize: 10,
    lineHeight: 15,
  },
  lock: {
    marginLeft: 10,
    color: 'rgba(241,90,36,0.52)',
    fontSize: 20,
  },
  recentPanel: {
    borderWidth: 1,
    borderColor: 'rgba(245,245,245,0.12)',
    backgroundColor: PANEL,
  },
  recentRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(245,245,245,0.12)',
  },
  recentTitle: {
    color: '#F5F5F5',
    fontFamily: 'Courier',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  recentTime: {
    marginTop: 4,
    color: 'rgba(245,245,245,0.38)',
    fontFamily: 'Courier',
    fontSize: 9,
  },
  readOnly: {
    color: 'rgba(241,90,36,0.62)',
    fontFamily: 'Courier',
    fontSize: 8,
    letterSpacing: 1,
  },
  button: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    borderWidth: 1,
    borderColor: ORANGE,
    backgroundColor: ORANGE,
  },
  buttonDisabled: { opacity: 0.62 },
  buttonText: {
    color: NAVY,
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  pressed: { opacity: 0.72 },
  footer: {
    marginTop: 22,
    color: 'rgba(245,245,245,0.28)',
    fontFamily: 'Courier',
    fontSize: 9,
    letterSpacing: 1.4,
    textAlign: 'center',
  },
})
