/**
 * CueRun Timer Engine
 *
 * Source of truth: wall-clock timestamps (Date.now() / ISO strings).
 * setInterval / requestAnimationFrame are ONLY used for visual refresh.
 * Elapsed time is always computed from timestamps, never accumulated ticks.
 *
 * Pause exclusion formula:
 *   duration = accumulatedMs + (now - resumedAt)
 *
 * Page Visibility API dipakai untuk detect HP layar mati/hidup.
 * Saat layar mati, JS berhenti — tapi timestamp tetap valid.
 * Saat layar hidup lagi, elapsed dihitung dari timestamp sebelum mati.
 */

export interface TimerSegment {
  accumulatedMs: number
  segmentStartMs: number
  pausedMs: number
  state: 'idle' | 'running' | 'paused' | 'finished'
  finalMs: number
}

export function createIdleTimer(): TimerSegment {
  return {
    accumulatedMs: 0,
    segmentStartMs: 0,
    pausedMs: 0,
    state: 'idle',
    finalMs: 0,
  }
}

export function startTimer(now: number = Date.now()): TimerSegment {
  return {
    accumulatedMs: 0,
    segmentStartMs: now,
    pausedMs: 0,
    state: 'running',
    finalMs: 0,
  }
}

export function pauseTimer(segment: TimerSegment, now: number = Date.now()): TimerSegment {
  if (segment.state !== 'running') return segment
  return {
    ...segment,
    pausedMs: now,
    state: 'paused',
  }
}

export function resumeTimer(segment: TimerSegment, now: number = Date.now()): TimerSegment {
  if (segment.state !== 'paused') return segment
  const pauseDuration = now - segment.pausedMs
  return {
    ...segment,
    segmentStartMs: segment.segmentStartMs + pauseDuration,
    pausedMs: 0,
    state: 'running',
  }
}

export function stopTimer(segment: TimerSegment, now: number = Date.now()): TimerSegment {
  if (segment.state === 'idle' || segment.state === 'finished') return segment
  const elapsed = computeElapsed(segment, now)
  return {
    ...segment,
    state: 'finished',
    finalMs: elapsed,
    pausedMs: 0,
  }
}

export function computeElapsed(segment: TimerSegment, now: number = Date.now()): number {
  switch (segment.state) {
    case 'idle':
      return 0
    case 'finished':
      return segment.finalMs
    case 'running':
      return segment.accumulatedMs + (now - segment.segmentStartMs)
    case 'paused':
      return segment.accumulatedMs + (segment.pausedMs - segment.segmentStartMs)
  }
}

export function reconstructFromRack(
  accumulatedMs: number,
  resumedAt: string | null,
  pausedAt: string | null,
  status: 'running' | 'paused'
): TimerSegment {
  const now = Date.now()

  if (status === 'paused' && pausedAt) {
    const pausedAtMs = new Date(pausedAt).getTime()
    const resumedAtMs = resumedAt ? new Date(resumedAt).getTime() : pausedAtMs
    const segmentDuration = pausedAtMs - resumedAtMs
    return {
      accumulatedMs: accumulatedMs + segmentDuration,
      segmentStartMs: 0,
      pausedMs: pausedAtMs,
      state: 'paused',
      finalMs: 0,
    }
  }

  // Running: resumedAt adalah awal segment saat ini
  // Dengan ini, elapsed sudah otomatis include waktu saat HP layar mati
  // karena segmentStartMs = timestamp lama, now = timestamp sekarang
  const resumedAtMs = resumedAt ? new Date(resumedAt).getTime() : now
  return {
    accumulatedMs,
    segmentStartMs: resumedAtMs,
    pausedMs: 0,
    state: 'running',
    finalMs: 0,
  }
}

export function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const millis = Math.floor(ms % 1000)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

export function formatMsShort(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}