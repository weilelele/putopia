import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  WebView,
  type WebViewMessageEvent,
  type WebViewNavigation,
} from 'react-native-webview'

const SITE_URL = 'https://www.multiverseco.org'
const START_URL = `${SITE_URL}/console?source=ios_app`
const APP_ID = 'org.multiverseco.collective'
const NUDGE_UNTIL_KEY = 'mc.push.nudgeUntil'
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
const PUSH_PREVIEW = process.env.EXPO_PUBLIC_PUSH_PREVIEW === '1'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

function safeRoute(value: unknown): string | null {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : null
}

function sessionProbeScript(): string {
  return `
    (function () {
      if (!location.hostname.endsWith('multiverseco.org')) return;
      fetch('/api/push/device', { credentials: 'include', cache: 'no-store' })
        .then(function (response) { return response.json(); })
        .then(function (data) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'push-session',
            authenticated: data.authenticated === true,
            deviceCount: data.deviceCount || 0
          }));
        })
        .catch(function () {});
    })();
    true;
  `
}

export default function App() {
  const webView = useRef<WebView>(null)
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [canGoBack, setCanGoBack] = useState(false)
  const [failed, setFailed] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [deviceToken, setDeviceToken] = useState<string | null>(null)
  const [deviceRegistered, setDeviceRegistered] = useState(false)
  const [showNudge, setShowNudge] = useState(false)
  const [permissionBusy, setPermissionBusy] = useState(false)
  const [permissionNote, setPermissionNote] = useState<string | null>(null)

  const openRoute = useCallback((routeValue: unknown) => {
    const route = safeRoute(routeValue)
    if (!route) return
    const target = `${SITE_URL}${route}`
    webView.current?.injectJavaScript(
      `window.location.assign(${JSON.stringify(target)}); true;`,
    )
  }, [])

  const syncDevice = useCallback((token: string) => {
    const environment = __DEV__ ? 'development' : 'production'
    webView.current?.injectJavaScript(`
      (function () {
        if (!location.hostname.endsWith('multiverseco.org')) return;
        localStorage.setItem('mc_ios_push_token', ${JSON.stringify(token)});
        fetch('/api/push/device', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: ${JSON.stringify(token)},
            environment: ${JSON.stringify(environment)},
            appId: ${JSON.stringify(APP_ID)}
          })
        }).then(function (response) {
          if (!response.ok) throw new Error('registration failed');
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'push-registration', registered: true }));
        }).catch(function () {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'push-registration', registered: false }));
        });
      })();
      true;
    `)
  }, [])

  const loadNativeToken = useCallback(async () => {
    if (!Device.isDevice) return null
    const token = await Notifications.getDevicePushTokenAsync()
    const value = typeof token.data === 'string' ? token.data : null
    if (value) setDeviceToken(value)
    return value
  }, [])

  useEffect(() => {
    void Notifications.getPermissionsAsync().then(async (permissions) => {
      if (permissions.granted) {
        await loadNativeToken().catch(() => null)
      }
    })

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openRoute(response.notification.request.content.data.route)
    })
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) setTimeout(() => openRoute(response.notification.request.content.data.route), 500)
    })

    return () => responseSubscription.remove()
  }, [loadNativeToken, openRoute])

  useEffect(() => {
    if (!authenticated && !PUSH_PREVIEW) {
      setShowNudge(false)
      return
    }
    if (deviceToken) {
      syncDevice(deviceToken)
      if (deviceRegistered) setShowNudge(false)
      return
    }

    void (async () => {
      const permissions = await Notifications.getPermissionsAsync()
      if (permissions.granted || !permissions.canAskAgain) return
      const deferredUntil = Number(await AsyncStorage.getItem(NUDGE_UNTIL_KEY) ?? 0)
      if (deferredUntil > Date.now()) return
      nudgeTimer.current = setTimeout(() => setShowNudge(true), 4000)
    })()

    return () => {
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current)
    }
  }, [authenticated, deviceRegistered, deviceToken, syncDevice])

  const handleNavigation = (event: WebViewNavigation) => {
    setCanGoBack(event.canGoBack)
    setFailed(false)
  }

  const handleRequest = (request: { url: string }) => {
    const scheme = request.url.split(':', 1)[0]?.toLowerCase()
    if (scheme === 'http' || scheme === 'https' || scheme === 'about' || scheme === 'blob') {
      return true
    }

    void Linking.openURL(request.url).catch(() => {})
    return false
  }

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as {
        type?: string
        authenticated?: boolean
        registered?: boolean
      }
      if (message.type === 'push-session') setAuthenticated(message.authenticated === true)
      if (message.type === 'push-registration') {
        const registered = message.registered === true
        setDeviceRegistered(registered)
        setShowNudge(!registered)
        setPermissionNote(registered ? null : 'DEVICE LINK FAILED. CHECK YOUR SIGNAL AND TRY AGAIN.')
      }
    } catch {
      // Ignore messages that are not part of the native bridge.
    }
  }

  const deferNudge = async () => {
    await AsyncStorage.setItem(NUDGE_UNTIL_KEY, String(Date.now() + SEVEN_DAYS))
    setShowNudge(false)
  }

  const enableNotifications = async () => {
    setPermissionBusy(true)
    setPermissionNote(null)
    try {
      const permissions = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      })
      if (!permissions.granted) {
        setShowNudge(false)
        return
      }

      if (!Device.isDevice) {
        setPermissionNote('AUTHORIZATION READY — REMOTE SIGNALS REQUIRE A REAL IPHONE.')
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'MULTIVERSE SIGNAL ONLINE',
            body: 'Notification display and routing are ready for device testing.',
            data: { route: '/console?source=local_push_test' },
          },
          trigger: null,
        })
        return
      }

      const token = await loadNativeToken()
      if (!token) throw new Error('Missing APNs token')
      setPermissionNote('CONNECTING THIS IPHONE…')
      syncDevice(token)
    } catch {
      setPermissionNote('SIGNAL REGISTRATION FAILED. TRY AGAIN WHEN ONLINE.')
    } finally {
      setPermissionBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" backgroundColor="#070912" />
      <WebView
        ref={webView}
        source={{ uri: START_URL }}
        style={styles.web}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        pullToRefreshEnabled
        setSupportMultipleWindows={false}
        applicationNameForUserAgent="MultiverseCollective/1.0"
        onNavigationStateChange={handleNavigation}
        onShouldStartLoadWithRequest={handleRequest}
        onMessage={handleMessage}
        onLoadEnd={() => webView.current?.injectJavaScript(sessionProbeScript())}
        onError={() => setFailed(true)}
        onHttpError={(event) => {
          if (event.nativeEvent.statusCode >= 500) setFailed(true)
        }}
        renderLoading={() => (
          <View style={styles.center}>
            <ActivityIndicator color="#E35205" size="large" />
            <Text style={styles.signal}>CONNECTING TO THE COLLECTIVE…</Text>
          </View>
        )}
        startInLoadingState
      />

      {showNudge && !failed && (
        <View style={styles.nudge} accessibilityLiveRegion="polite">
          <View style={styles.nudgeHeader}>
            <Text style={styles.nudgeEyebrow}>SIGNAL LINK AVAILABLE</Text>
            <Pressable
              accessibilityLabel="Not now"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => void deferNudge()}
            >
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.nudgeTitle}>STAY IN THE LOOP</Text>
          <Text style={styles.nudgeBody}>
            Get replies, Signal dispatches, and device updates. No marketing transmissions.
          </Text>
          {permissionNote && <Text style={styles.permissionNote}>{permissionNote}</Text>}
          <View style={styles.nudgeActions}>
            <Pressable
              accessibilityRole="button"
              disabled={permissionBusy}
              onPress={() => void enableNotifications()}
              style={({ pressed }) => [styles.enableButton, pressed && styles.pressed]}
            >
              <Text style={styles.enableText}>{permissionBusy ? 'CONNECTING…' : 'ENABLE UPDATES'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void deferNudge()}
              style={({ pressed }) => [styles.notNowButton, pressed && styles.pressed]}
            >
              <Text style={styles.notNowText}>NOT NOW</Text>
            </Pressable>
          </View>
        </View>
      )}

      {failed && (
        <View style={styles.error}>
          <Text style={styles.errorCode}>SIGNAL INTERRUPTED</Text>
          <Text style={styles.errorBody}>
            The Console needs a network connection. Check your signal and try again.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setFailed(false)
              webView.current?.reload()
            }}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>RECONNECT</Text>
          </Pressable>
          {canGoBack && (
            <Pressable
              accessibilityRole="button"
              onPress={() => webView.current?.goBack()}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            >
              <Text style={styles.backText}>← PREVIOUS CHANNEL</Text>
            </Pressable>
          )}
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#070912' },
  web: { flex: 1, backgroundColor: '#070912' },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    backgroundColor: '#070912',
  },
  signal: {
    color: 'rgba(245,245,245,0.55)',
    fontFamily: 'Courier',
    fontSize: 12,
    letterSpacing: 1.2,
  },
  nudge: {
    position: 'absolute',
    right: 12,
    bottom: 18,
    left: 12,
    borderWidth: 1,
    borderColor: 'rgba(227,82,5,0.72)',
    backgroundColor: '#0B1028',
    padding: 18,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.42,
    shadowRadius: 14,
    elevation: 12,
  },
  nudgeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nudgeEyebrow: {
    color: '#E35205',
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  close: { color: 'rgba(245,245,245,0.62)', fontSize: 28, lineHeight: 30 },
  nudgeTitle: {
    color: '#F5F5F5',
    fontFamily: 'Courier',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  nudgeBody: {
    color: 'rgba(245,245,245,0.7)',
    fontFamily: 'Courier',
    fontSize: 13,
    lineHeight: 20,
  },
  permissionNote: {
    color: '#E35205',
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 18,
  },
  nudgeActions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  enableButton: {
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E35205',
    paddingHorizontal: 12,
  },
  enableText: {
    color: '#070912',
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  notNowButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,245,245,0.24)',
    paddingHorizontal: 16,
  },
  notNowText: {
    color: 'rgba(245,245,245,0.72)',
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  error: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'stretch',
    justifyContent: 'center',
    padding: 28,
    gap: 18,
    backgroundColor: '#070912',
  },
  errorCode: {
    color: '#E35205',
    fontFamily: 'Courier',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  errorBody: {
    color: 'rgba(245,245,245,0.68)',
    fontFamily: 'Courier',
    fontSize: 15,
    lineHeight: 23,
  },
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E35205',
    backgroundColor: '#E35205',
  },
  buttonText: {
    color: '#070912',
    fontFamily: 'Courier',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  back: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  backText: {
    color: 'rgba(245,245,245,0.55)',
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  pressed: { opacity: 0.72 },
})
