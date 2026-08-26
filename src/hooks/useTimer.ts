import { useState, useEffect, useRef, useCallback } from 'react'
import {
  TimerSegment,
  createIdleTimer,
  startTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  computeElapsed,
  reconstructFromRack,
} from '@/timer/timerEngine'
import { Rack } from '@/types'

export interface UseTimerReturn {
  elapsedMs: number
  timerState: TimerSegment['state']
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => number
  resetToIdle: () => void
  restoreFromRack: (rack: Rack) => void
}

export function useTimer(): UseTimerReturn {
  const [segment, setSegment] = useState<TimerSegment>(createIdleTimer)
  const [elapsedMs, setElapsedMs] = useState(0)
  const rafRef = useRef<number>(0)
  const segmentRef = useRef<TimerSegment>(segment)

  useEffect(() => {
    segmentRef.current = segment
  }, [segment])

  // RAF display loop
  useEffect(() => {
    if (segment.state !== 'running') {
      cancelAnimationFrame(rafRef.current)
      setElapsedMs(computeElapsed(segment, Date.now()))
      return
    }

    let animId: number
    const tick = () => {
      setElapsedMs(computeElapsed(segmentRef.current, Date.now()))
      animId = requestAnimationFrame(tick)
      rafRef.current = animId
    }
    animId = requestAnimationFrame(tick)
    rafRef.current = animId

    return () => cancelAnimationFrame(animId)  // ← pakai local variable, bukan rafRef
  }, [segment.state])

  // Page Visibility — HANYA trigger re-sync elapsed, BUKAN kelola RAF
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tidak perlu restart RAF — useEffect([segment.state]) sudah handle itu
        // Hanya perlu sync nilai elapsed setelah "lompatan waktu"
        const seg = segmentRef.current
        if (seg.state === 'running') {
          setElapsedMs(computeElapsed(seg, Date.now()))
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const start = useCallback(() => {
    const seg = startTimer(Date.now())
    setSegment(seg)
  }, [])

  const pause = useCallback(() => {
    setSegment((prev) => pauseTimer(prev, Date.now()))
  }, [])

  const resume = useCallback(() => {
    setSegment((prev) => resumeTimer(prev, Date.now()))
  }, [])

  const stop = useCallback((): number => {
    const finalMs = computeElapsed(segmentRef.current, Date.now())
    setSegment((prev) => stopTimer(prev, Date.now()))
    return finalMs
  }, [])

  const resetToIdle = useCallback(() => {
    setSegment(createIdleTimer())
    setElapsedMs(0)
  }, [])

  const restoreFromRack = useCallback((rack: Rack) => {
    if (rack.status !== 'running' && rack.status !== 'paused') return
    const seg = reconstructFromRack(
      rack.durationMs,
      rack.resumedAt,
      rack.pausedAt,
      rack.status
    )
    setSegment(seg)
    setElapsedMs(computeElapsed(seg, Date.now()))
  }, [])

  return {
    elapsedMs,
    timerState: segment.state,
    start,
    pause,
    resume,
    stop,
    resetToIdle,
    restoreFromRack,
  }
}