import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  AppState,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  WebView,
  type WebViewMessageEvent,
} from 'react-native-webview'
import { OfflineHome } from './OfflineHome'
import { cacheOfflineMedia } from './offline-media'
import {
  OFFLINE_MEDIA_STORAGE_KEY,
  OFFLINE_SNAPSHOT_STORAGE_KEY,
  collectOfflineMediaUrls,
  offlineSnapshotScript,
  parseOfflineMediaMap,
  parseOfflineSnapshot,
  shouldShowOffline,
  type OfflineMediaMap,
  type OfflineSnapshot,
} from './offline'

const SITE_URL = 'https://www.multiverseco.org'
const START_URL = `${SITE_URL}/console?source=ios_app`
const APP_ID = 'org.multiverseco.collective'
const PUSH_PREVIEW = process.env.EXPO_PUBLIC_PUSH_PREVIEW === '1'
const PUSH_SYNC_RETRY_DELAYS = [2_000, 5_000, 15_000, 60_000]

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
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (data) {
            return { ok: response.ok, status: response.status, data: data };
          });
        })
        .then(function (result) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'push-session',
            authenticated: result.data.authenticated === true,
            deviceCount: Number(result.data.deviceCount || 0),
            ok: result.ok,
            status: result.status,
            error: typeof result.data.error === 'string' ? result.data.error : null
          }));
        })
        .catch(function (error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'push-session-error',
            ok: false,
            status: 0,
            error: error && error.message ? error.message : 'Session probe failed'
          }));
        });
    })();
    true;
  `
}

export default function App() {
  const webView = useRef<WebView>(null)
  const permissionStarted = useRef(false)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCount = useRef(0)
  const wasOffline = useRef(false)
  const verifiedSession = useRef<boolean | null>(null)
  const offlineMediaGeneration = useRef(0)
  const [failed, setFailed] = useState(false)
  const [networkState, setNetworkState] = useState<'unknown' | 'online' | 'offline'>('unknown')
  const [reconnecting, setReconnecting] = useState(false)
  const [offlineSnapshot, setOfflineSnapshot] = useState<OfflineSnapshot | null>(null)
  const [offlineMedia, setOfflineMedia] = useState<OfflineMediaMap>({})
  const [authenticated, setAuthenticated] = useState(false)
  const [deviceToken, setDeviceToken] = useState<string | null>(null)
  const [registeredToken, setRegisteredToken] = useState<string | null>(null)
  const [syncGeneration, setSyncGeneration] = useState(0)

  const openRoute = useCallback((routeValue: unknown) => {
    const route = safeRoute(routeValue)
    if (!route) return
    webView.current?.injectJavaScript(
      `window.location.assign(${JSON.stringify(`${SITE_URL}${route}`)}); true;`,
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
          return response.json().catch(function () { return {}; }).then(function (data) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'push-device-sync',
              ok: response.ok && data.registered === true,
              status: response.status,
              error: typeof data.error === 'string' ? data.error : null,
              code: typeof data.code === 'string' ? data.code : null
            }));
          });
        }).catch(function (error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'push-device-sync',
            ok: false,
            status: 0,
            error: error && error.message ? error.message : 'Device registration failed'
          }));
        });
      })();
      true;
    `)
  }, [])

  const scheduleDeviceSyncRetry = useCallback(() => {
    if (retryTimer.current) clearTimeout(retryTimer.current)
    const index = Math.min(retryCount.current, PUSH_SYNC_RETRY_DELAYS.length - 1)
    const delay = PUSH_SYNC_RETRY_DELAYS[index]
    retryCount.current += 1
    retryTimer.current = setTimeout(() => setSyncGeneration((value) => value + 1), delay)
  }, [])

  const loadNativeToken = useCallback(async () => {
    if (!Device.isDevice) return null
    const token = await Notifications.getDevicePushTokenAsync()
    const value = typeof token.data === 'string' ? token.data : null
    if (value) setDeviceToken(value)
    return value
  }, [])

  const requestSystemNotifications = useCallback(async () => {
    if (permissionStarted.current) return
    permissionStarted.current = true

    try {
      let permissions = await Notifications.getPermissionsAsync()
      if (!permissions.granted && permissions.canAskAgain) {
        permissions = await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: true, allowSound: true },
        })
      }
      if (!permissions.granted) return

      await loadNativeToken()
    } catch (error) {
      permissionStarted.current = false
      console.warn('[push] Could not obtain the native device token.', error)
      scheduleDeviceSyncRetry()
    }
  }, [loadNativeToken, scheduleDeviceSyncRetry])

  useEffect(() => {
    void AsyncStorage.multiGet([OFFLINE_SNAPSHOT_STORAGE_KEY, OFFLINE_MEDIA_STORAGE_KEY])
      .then((entries) => {
        setOfflineSnapshot(parseOfflineSnapshot(entries[0]?.[1] ?? null))
        setOfflineMedia(parseOfflineMediaMap(entries[1]?.[1] ?? null))
      })
      .catch(() => {
        setOfflineSnapshot(null)
        setOfflineMedia({})
      })

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected == null) {
        setNetworkState('unknown')
        return
      }
      const connected = state.isConnected === true && state.isInternetReachable !== false
      setNetworkState(connected ? 'online' : 'offline')
      if (!connected) {
        wasOffline.current = true
        setFailed(true)
        setReconnecting(false)
        return
      }

      if (wasOffline.current) {
        wasOffline.current = false
        setReconnecting(true)
        webView.current?.reload()
      }
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    void Notifications.getPermissionsAsync().then(async (permissions) => {
      if (permissions.granted) await loadNativeToken().catch(() => null)
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
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return
      permissionStarted.current = false
      retryCount.current = 0
      setRegisteredToken(null)
      setSyncGeneration((value) => value + 1)
    })
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (!authenticated && !PUSH_PREVIEW) return
    if (deviceToken && registeredToken !== deviceToken) {
      syncDevice(deviceToken)
      return
    }

    const timer = setTimeout(() => void requestSystemNotifications(), 1500)
    return () => clearTimeout(timer)
  }, [authenticated, deviceToken, registeredToken, requestSystemNotifications, syncDevice, syncGeneration])

  useEffect(() => {
    if (authenticated || syncGeneration === 0) return
    webView.current?.injectJavaScript(sessionProbeScript())
  }, [authenticated, syncGeneration])

  useEffect(() => () => {
    if (retryTimer.current) clearTimeout(retryTimer.current)
  }, [])

  const retryConsole = useCallback(() => {
    setReconnecting(true)
    void NetInfo.fetch().then((state) => {
      const connected = state.isConnected === true && state.isInternetReachable !== false
      setNetworkState(connected ? 'online' : 'offline')
      if (connected) {
        webView.current?.reload()
      } else {
        setFailed(true)
        setReconnecting(false)
      }
    }).catch(() => {
      setFailed(true)
      setReconnecting(false)
    })
  }, [])

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
        deviceCount?: number
        ok?: boolean
        status?: number
        error?: string | null
        code?: string | null
        snapshot?: unknown
      }
      if (message.type === 'push-session') {
        const nextAuthenticated = message.authenticated === true
        const previouslyAuthenticated = verifiedSession.current === true
        verifiedSession.current = nextAuthenticated
        setAuthenticated(nextAuthenticated)
        if (!nextAuthenticated) {
          setOfflineSnapshot((current) => {
            if (!current?.viewer.authenticated) return current
            offlineMediaGeneration.current += 1
            void AsyncStorage.multiRemove([OFFLINE_SNAPSHOT_STORAGE_KEY, OFFLINE_MEDIA_STORAGE_KEY]).catch(() => {})
            void cacheOfflineMedia([], offlineMedia).catch(() => {})
            setOfflineMedia({})
            return null
          })
        } else {
          webView.current?.injectJavaScript(offlineSnapshotScript(!previouslyAuthenticated))
        }
        if (message.ok === false && message.authenticated) {
          console.warn('[push] Push storage check failed.', message.status, message.error)
        }
      }
      if (message.type === 'push-session-error') {
        console.warn('[push] Could not verify the signed-in session.', message.status, message.error)
        scheduleDeviceSyncRetry()
      }
      if (message.type === 'push-device-sync') {
        if (message.ok) {
          retryCount.current = 0
          if (retryTimer.current) clearTimeout(retryTimer.current)
          setRegisteredToken(deviceToken)
        } else {
          console.warn(
            '[push] Device registration failed; retry scheduled.',
            message.status,
            message.code,
            message.error,
          )
          setRegisteredToken(null)
          scheduleDeviceSyncRetry()
        }
      }
      if (message.type === 'offline-snapshot') {
        const next = parseOfflineSnapshot(message.snapshot)
        if (!next || !next.viewer.authenticated || verifiedSession.current !== true) return
        const mediaGeneration = offlineMediaGeneration.current
        setOfflineSnapshot(next)
        void AsyncStorage.setItem(OFFLINE_SNAPSHOT_STORAGE_KEY, JSON.stringify(next)).catch(() => {})
        void cacheOfflineMedia(collectOfflineMediaUrls(next), offlineMedia)
          .then((nextMedia) => {
            if (mediaGeneration !== offlineMediaGeneration.current) {
              void cacheOfflineMedia([], nextMedia).catch(() => {})
              return
            }
            setOfflineMedia(nextMedia)
            void AsyncStorage.setItem(OFFLINE_MEDIA_STORAGE_KEY, JSON.stringify(nextMedia)).catch(() => {})
          })
          .catch(() => {})
      }
    } catch {
      // Ignore messages that are not part of the native bridge.
    }
  }

  const showOffline = shouldShowOffline(networkState, failed)

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
        onShouldStartLoadWithRequest={handleRequest}
        onMessage={handleMessage}
        onLoad={() => {
          if (networkState !== 'offline') {
            setFailed(false)
            setReconnecting(false)
          }
        }}
        onLoadEnd={() => {
          webView.current?.injectJavaScript(sessionProbeScript())
        }}
        onError={() => {
          setFailed(true)
          setReconnecting(false)
        }}
        onHttpError={(event) => {
          if (event.nativeEvent.statusCode >= 500) {
            setFailed(true)
            setReconnecting(false)
          }
        }}
        renderLoading={() => (
          <View style={styles.center}>
            <ActivityIndicator color="#E35205" size="large" />
            <Text style={styles.signal}>CONNECTING TO THE COLLECTIVE…</Text>
          </View>
        )}
        startInLoadingState
      />

      {showOffline && (
        <OfflineHome
          connected={networkState === 'online'}
          reconnecting={reconnecting}
          snapshot={offlineSnapshot}
          media={offlineMedia}
          onRetry={retryConsole}
        />
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
})
