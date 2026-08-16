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
  stop: () => number  // returns final ms
  resetToIdle: () => void
  restoreFromRack: (rack: Rack) => void
}

export function useTimer(): UseTimerReturn {
  const [segment, setSegment] = useState<TimerSegment>(createIdleTimer)
  const [elapsedMs, setElapsedMs] = useState(0)
  const rafRef = useRef<number>(0)
  const segmentRef = useRef<TimerSegment>(segment)

  // Keep ref in sync for RAF callback
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

  const start = useCallback(() => {
    const seg = startTimer(Date.now())
    setSegment(seg)
  }, [])

  const pause = useCallback(() => {
    setSegment((prev) => {
      const seg = pauseTimer(prev, Date.now())
      return seg
    })
  }, [])

  const resume = useCallback(() => {
    setSegment((prev) => {
      const seg = resumeTimer(prev, Date.now())
      return seg
    })
  }, [])

  const stop = useCallback((): number => {
    let finalMs = 0
    setSegment((prev) => {
      const seg = stopTimer(prev, Date.now())
      finalMs = seg.finalMs
      return seg
    })
    // Return is async due to setState batching, so compute here too
    finalMs = computeElapsed(segmentRef.current, Date.now())
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
