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
 * where accumulatedMs is the sum of all completed running segments before the
 * current one, and resumedAt is the timestamp when the current segment began.
 */

export interface TimerSnapshot {
  elapsedMs: number
  state: 'idle' | 'running' | 'paused' | 'finished'
}

export interface TimerSegment {
  accumulatedMs: number   // ms from all previous completed segments
  segmentStartMs: number  // Date.now() when current segment started (0 if idle/finished)
  pausedMs: number        // Date.now() when currently paused (0 if not paused)
  state: 'idle' | 'running' | 'paused' | 'finished'
  finalMs: number         // Only set in 'finished' state
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
  // The paused interval is excluded: treat segment as if it started fresh now,
  // but carry over the accumulated ms from before the pause.
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

// ─── Recovery ────────────────────────────────────────────────────────────────

/**
 * Reconstruct a TimerSegment from persisted rack data.
 * Called when user returns to app mid-rack (after refresh, background, etc.)
 */
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

  // Running: treat resumed time as segment start
  const resumedAtMs = resumedAt ? new Date(resumedAt).getTime() : now
  return {
    accumulatedMs,
    segmentStartMs: resumedAtMs,
    pausedMs: 0,
    state: 'running',
    finalMs: 0,
  }
}

// ─── Format ──────────────────────────────────────────────────────────────────

/**
 * Format milliseconds as MM:SS.mmm
 * e.g. 75430 → "01:15.430"
 */
export function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const millis = Math.floor(ms % 1000)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

/**
 * Format milliseconds as MM:SS (no millis, for history lists)
 */
export function formatMsShort(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
