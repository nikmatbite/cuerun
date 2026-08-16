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
    const tick = () => {
      const seg = segmentRef.current
      if (seg.state === 'running') {
        setElapsedMs(computeElapsed(seg, Date.now()))
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    if (segment.state === 'running') {
      rafRef.current = requestAnimationFrame(tick)
    } else {
      cancelAnimationFrame(rafRef.current)
      setElapsedMs(computeElapsed(segment, Date.now()))
    }

    return () => cancelAnimationFrame(rafRef.current)
  }, [segment.state]) // eslint-disable-line react-hooks/exhaustive-deps

  // Page Visibility API — handle layar mati/hidup
  // Saat layar hidup lagi, force re-render dengan elapsed terbaru
  // Timer engine sudah timestamp-based jadi otomatis akurat
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const seg = segmentRef.current
        if (seg.state === 'running') {
          // Force update elapsed dari timestamp terbaru
          setElapsedMs(computeElapsed(seg, Date.now()))
          // Restart RAF loop
          cancelAnimationFrame(rafRef.current)
          const tick = () => {
            const s = segmentRef.current
            if (s.state === 'running') {
              setElapsedMs(computeElapsed(s, Date.now()))
              rafRef.current = requestAnimationFrame(tick)
            }
          }
          rafRef.current = requestAnimationFrame(tick)
        }
      } else {
        // Layar mati — stop RAF (tidak perlu update display)
        cancelAnimationFrame(rafRef.current)
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