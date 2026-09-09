import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { launchAssets, launchManifest } from './launch-assets'

const cells = Object.entries(launchManifest.rows).flatMap(([row, value]) => value.cells.map(cell => ({ ...cell, row, pool: value.pool, order: row === '1' ? cell.i : value.cells.length - 1 - cell.i })))
const left = Math.min(...cells.map(cell => cell.x))
const top = Math.min(...cells.map(cell => cell.y))
const width = Math.max(...cells.map(cell => cell.x + cell.w)) - left
const height = Math.max(...cells.map(cell => cell.y + cell.h)) - top

function Flap({ cell, scale }: { cell: typeof cells[number]; scale: number }) {
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
      Animated.timing(rotation, { toValue: 1, duration: 150, useNativeDriver: true }).start()
    }, 380 + cell.order * 150)
    return () => { clearInterval(interval); clearTimeout(settled); rotation.stopAnimation() }
  }, [cell, rotation])
  return <Animated.Image source={launchAssets[source]} resizeMode="contain" style={{ position: 'absolute', left: (cell.x - left) * scale, top: (cell.y - top) * scale, width: cell.w * scale, height: cell.h * scale, transform: [{ perspective: 800 }, { rotateX: rotation.interpolate({ inputRange: [0, 1], outputRange: ['80deg', '0deg'] }) }] }} />
}

/** Bundled native launch surface: the deadline does not depend on the network. */
export function LaunchScreen({ onComplete }: { onComplete: () => void }) {
  const finished = useRef(false)
  const [reduceMotion, setReduceMotion] = useState(true)
  const { width: viewport } = useWindowDimensions()
  const scale = Math.min(600, viewport - 48) / width
  const finish = () => { if (!finished.current) { finished.current = true; onComplete() } }
  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value) })
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    const deadline = setTimeout(() => { if (!finished.current) { finished.current = true; onComplete() } }, 3000)
    return () => { mounted = false; clearTimeout(deadline); subscription.remove() }
  }, [onComplete])
  return <Pressable accessibilityRole="button" accessibilityLabel="Enter Dashboard" onPress={finish} style={styles.screen}>
    {reduceMotion ? <Image source={require('./assets/vi-wordmark.png')} resizeMode="contain" style={{ width: width * scale, height: height * scale }} /> : <View accessible={false} style={{ width: width * scale, height: height * scale }}>{cells.map(cell => <Flap key={`${cell.row}-${cell.i}`} cell={cell} scale={scale} />)}</View>}
    <Text style={styles.hint}>Tap anywhere to enter</Text>
  </Pressable>
}
const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFillObject, zIndex: 100, backgroundColor: '#080C20', alignItems: 'center', justifyContent: 'center', padding: 24 },
  hint: { position: 'absolute', bottom: 36, color: '#F5F5F5', fontFamily: 'CourierPrime', fontSize: 14 },
})
