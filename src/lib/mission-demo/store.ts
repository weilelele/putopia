'use client'
import { useSyncExternalStore } from 'react'
import { createInitialState, reduceMission, type MissionAction } from './engine'
import type { MissionState } from './index'
export type { MissionAction } from './engine'
export const MISSION_STORAGE_KEY = 'putopia:mission-demo:v1'
let state = createInitialState(), ready = false, started = false
const serverState = state
const listeners = new Set<() => void>()
let channel: BroadcastChannel | undefined
function emit() { for (const listener of listeners) listener() }
function read(): MissionState | undefined { const raw = localStorage.getItem(MISSION_STORAGE_KEY); if (!raw) return; const value = JSON.parse(raw); if (value.version !== 1 || !value.state?.worlds || !value.state?.devices || typeof value.state.revision !== 'number') throw new Error('Invalid demo snapshot'); return value.state }
function refresh() { try { const next = read(); if (next && next.revision >= state.revision) { state = next; emit() } } catch { ready = false; state = { ...state, feedback: 'Invalid local snapshot. Clear demo site data to restart.' }; emit() } }
function start() {
  if (started) return
  started = true
  try { state = read() ?? createInitialState(Date.now()); ready = !!navigator.locks; if (!ready) state = { ...state, feedback: 'This browser cannot coordinate local demo writes. Use a browser with Web Locks support.' }; channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(MISSION_STORAGE_KEY) : undefined; if (channel) channel.onmessage = refresh; window.addEventListener('storage', event => { if (event.key === MISSION_STORAGE_KEY) refresh() }); window.setInterval(() => { if (ready && listeners.size > 0 && document.visibilityState === 'visible') dispatch({ type: 'advance-time', seconds: 0 }) }, 5000); emit() } catch { ready = false; state = { ...state, feedback: 'Local storage is unavailable or the demo snapshot is invalid. Enable browser storage or clear this demo’s site data.' }; emit() }
}
function subscribe(listener: () => void) { listeners.add(listener); start(); return () => { listeners.delete(listener) } }
function dispatch(action: MissionAction) {
  if (!ready) return
  // Capture the initiating identity before waiting for another tab’s transaction.
  const captured = action.type === 'send-energy' || action.type === 'add-note' ? { ...action, deviceId: state.activeDeviceId, ...(action.type === 'send-energy' ? { sample: Math.random() } : {}) } : action
  void navigator.locks.request(MISSION_STORAGE_KEY, () => { try { const latest = read() ?? state; const next = reduceMission(latest, captured, Date.now()); localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify({ version: 1, state: next })); state = next; emit(); channel?.postMessage(next.revision) } catch { state = { ...state, feedback: 'The local operation could not be saved. Check browser storage before retrying.' }; ready = false; emit() } }).catch(() => { ready = false; state = { ...state, feedback: 'Browser coordination failed. Reload to reconnect the local demo.' }; emit() })
}
export function useMissionDemo() { const snapshot = useSyncExternalStore(subscribe, () => state, () => serverState); return { state: snapshot, dispatch, ready } }
