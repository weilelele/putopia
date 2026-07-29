import { StatusBar } from 'expo-status-bar'
import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { WebView, type WebViewNavigation } from 'react-native-webview'

const START_URL = 'https://www.multiverseco.org/console?source=ios_app'

export default function App() {
  const webView = useRef<WebView>(null)
  const [canGoBack, setCanGoBack] = useState(false)
  const [failed, setFailed] = useState(false)

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
