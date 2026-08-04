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
            authenticated: data.authenticated === true
          }));
        })
        .catch(function () {});
    })();
    true;
  `
}

export default function App() {
  const webView = useRef<WebView>(null)
  const permissionStarted = useRef(false)
  const [canGoBack, setCanGoBack] = useState(false)
  const [failed, setFailed] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [deviceToken, setDeviceToken] = useState<string | null>(null)

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
        }).catch(function () {});
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

      const token = await loadNativeToken()
      if (token) syncDevice(token)
    } catch {
      // Permission or APNs registration can be retried on the next app launch.
    }
  }, [loadNativeToken, syncDevice])

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
    if (!authenticated && !PUSH_PREVIEW) return
    if (deviceToken) {
      syncDevice(deviceToken)
      return
    }

    const timer = setTimeout(() => void requestSystemNotifications(), 1500)
    return () => clearTimeout(timer)
  }, [authenticated, deviceToken, requestSystemNotifications, syncDevice])

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
      }
      if (message.type === 'push-session') setAuthenticated(message.authenticated === true)
    } catch {
      // Ignore messages that are not part of the native bridge.
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
