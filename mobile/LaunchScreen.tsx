import { useCallback, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { launchAssets, launchManifest } from './launch-assets'

const cells = Object.entries(launchManifest.rows).flatMap(([row, value]) => value.cells.map(cell => ({ ...cell, row, pool: value.pool, order: row === '1' ? cell.i : value.cells.length - 1 - cell.i })))
const left = Math.min(...cells.map(cell => cell.x))
const top = Math.min(...cells.map(cell => cell.y))
const width = Math.max(...cells.map(cell => cell.x + cell.w)) - left
const height = Math.max(...cells.map(cell => cell.y + cell.h)) - top

function Flap({ cell, scale, onSettled }: { cell: typeof cells[number]; scale: number; onSettled: (key: string) => void }) {
  const [source, setSource] = useState(cell.file)
  const rotation = useRef(new Animated.Value(0)).current
  useEffect(() => {
    let index = cell.i
    const flip = () => {
      setSource(cell.pool[index++ % cell.pool.length])
      rotation.setValue(0)
      Animated.timing(rotation, { toValue: 1, duration: 70, useNativeDriver: true }).start()
    }
    const interval = setInterval(flip, 80)
    const settled = setTimeout(() => {
      clearInterval(interval)
      setSource(cell.file)
      rotation.setValue(0)
      Animated.timing(rotation, { toValue: 1, duration: 150, useNativeDriver: true }).start(({ finished }) => { if (finished) onSettled(`${cell.row}-${cell.i}`) })
    }, 380 + cell.order * 150)
    return () => { clearInterval(interval); clearTimeout(settled); rotation.stopAnimation() }
  }, [cell, rotation, onSettled])
  return <Animated.Image source={launchAssets[source]} resizeMode="contain" style={{ position: 'absolute', left: (cell.x - left) * scale, top: (cell.y - top) * scale, width: cell.w * scale, height: cell.h * scale, transform: [{ perspective: 800 }, { rotateX: rotation.interpolate({ inputRange: [0, 1], outputRange: ['80deg', '0deg'] }) }] }} />
}

/** Bundled native launch surface: the deadline does not depend on the network. */
export function LaunchScreen({ onComplete }: { onComplete: () => void }) {
  const finished = useRef(false)
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null)
  const [playbackComplete, setPlaybackComplete] = useState(false)
  const [staticReady, setStaticReady] = useState(false)
  const settledCells = useRef(new Set<string>())
  const onSettled = useCallback((key: string) => {
    settledCells.current.add(key)
    if (settledCells.current.size === cells.length) setPlaybackComplete(true)
  }, [])
  const { width: viewport } = useWindowDimensions()
  const scale = Math.min(520, (viewport - 48) * 0.82) / width
  const finish = useCallback(() => { if (!finished.current) { finished.current = true; onComplete() } }, [onComplete])
  useEffect(() => {
    let mounted = true
    const setMotion = (value: boolean) => {
      if (!mounted) return
      settledCells.current.clear()
      setPlaybackComplete(false)
      setReduceMotion(value)
    }
    AccessibilityInfo.isReduceMotionEnabled().then(setMotion).catch(() => setMotion(true))
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setMotion)
    return () => { mounted = false; subscription.remove() }
  }, [])
  const ready = reduceMotion === true ? staticReady : reduceMotion === false && playbackComplete
  useEffect(() => {
    if (!ready) return
    const deadline = setTimeout(finish, 3000)
    return () => clearTimeout(deadline)
  }, [ready, finish])
  return <Pressable accessibilityRole="button" accessibilityLabel="Enter Dashboard" onPress={finish} style={styles.screen}>
    {reduceMotion !== false ? <Image source={require('./assets/vi-wordmark.png')} resizeMode="contain" onLoad={() => setStaticReady(true)} onError={() => setStaticReady(true)} style={{ width: width * scale, height: height * scale }} /> : <View accessible={false} style={{ width: width * scale, height: height * scale }}>{cells.map(cell => <Flap key={`${cell.row}-${cell.i}`} cell={cell} scale={scale} onSettled={onSettled} />)}</View>}
    <Image source={require('./assets/vi-icon.png')} resizeMode="contain" accessibilityIgnoresInvertColors style={styles.symbol} />
    <Text style={styles.hint}>Tap anywhere to enter</Text>
  </Pressable>
}
const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFillObject, zIndex: 100, backgroundColor: '#080C20', alignItems: 'center', justifyContent: 'center', padding: 24 },
  symbol: { width: 48, height: 48 * 492 / 881, marginTop: 24 },
  hint: { position: 'absolute', bottom: 36, color: '#F5F5F5', fontFamily: 'CourierPrime', fontSize: 14 },
})
