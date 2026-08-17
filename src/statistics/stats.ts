/**
 * CueRun Statistics
 *
 * All functions are pure and deterministic.
 * Only racks with status === 'completed' are included.
 * Statistics are always separated by mode + drill + variant.
 *
 * Consistency Score Formula:
 *   CV  = standard_deviation / mean
 *   score = clamp(100 × (1 − CV), 0, 100)
 *
 *   CV 0%  → 100
 *   CV 20% → 80
 *   CV 35% → 65
 *
 * Minimum 5 completed racks required for Consistency and Best Average (5).
 */

import { Rack, GameMode, Drill, Variant, SessionStats, OverallStats } from '@/types'

// ─── Filtering ───────────────────────────────────────────────────────────────

export function filterCompleted(racks: Rack[]): Rack[] {
  return racks.filter((r) => r.status === 'completed')
}

export function filterByGroup(
  racks: Rack[],
  mode: GameMode,
  drill: Drill,
  variant: Variant
): Rack[] {
  return filterCompleted(racks).filter(
    (r) => r.mode === mode && r.drill === drill && r.variant === variant
  )
}

// Khusus untuk Break & Run: gabungkan solids + stripes tanpa filter variant
export function filterByGroupIgnoreVariant(
  racks: Rack[],
  mode: GameMode,
  drill: Drill
): Rack[] {
  return filterCompleted(racks).filter(
    (r) => r.mode === mode && r.drill === drill
  )
}

// Overall stats untuk Break & Run (solids + stripes digabung)
export function calculateOverallStatisticsMerged(
  allRacks: Rack[],
  mode: GameMode,
  drill: Drill
): OverallStats {
  const completed = filterByGroupIgnoreVariant(allRacks, mode, drill)
  const durations = completed.map((r) => r.durationMs)

  if (durations.length === 0) {
    return {
      mode,
      drill,
      variant: null,
      totalRacks: 0,
      personalBest: 0,
      average: 0,
      median: 0,
      bestAverage5: null,
      consistency: null,
    }
  }

  return {
    mode,
    drill,
    variant: null,
    totalRacks: durations.length,
    personalBest: calculateBest(durations),
    average: calculateAverage(durations),
    median: calculateMedian(durations),
    bestAverage5: calculateBestAverage5(durations),
    consistency: calculateConsistency(durations),
  }
}

export function filterBySession(racks: Rack[], sessionId: string): Rack[] {
  return racks.filter((r) => r.sessionId === sessionId)
}

// ─── Core Math ───────────────────────────────────────────────────────────────

export function calculateAverage(durations: number[]): number {
  if (durations.length === 0) return 0
  return durations.reduce((sum, d) => sum + d, 0) / durations.length
}

export function calculateMedian(durations: number[]): number {
  if (durations.length === 0) return 0
  const sorted = [...durations].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function calculateBest(durations: number[]): number {
  if (durations.length === 0) return 0
  return Math.min(...durations)
}

export function calculateStdDev(durations: number[], mean: number): number {
  if (durations.length < 2) return 0
  const variance = durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length
  return Math.sqrt(variance)
}

/**
 * Consistency Score = clamp(100 × (1 − CV), 0, 100)
 * CV = standard_deviation / mean
 * Returns null if fewer than 5 racks.
 */
export function calculateConsistency(durations: number[]): number | null {
  if (durations.length < 5) return null
  const mean = calculateAverage(durations)
  if (mean === 0) return null
  const stdDev = calculateStdDev(durations, mean)
  const cv = stdDev / mean
  return Math.max(0, Math.min(100, Math.round(100 * (1 - cv))))
}

/**
 * Best Average of the 5 fastest completed racks across all sessions.
 * Returns null if fewer than 5 racks.
 */
export function calculateBestAverage5(durations: number[]): number | null {
  if (durations.length < 5) return null
  const sorted = [...durations].sort((a, b) => a - b)
  const top5 = sorted.slice(0, 5)
  return calculateAverage(top5)
}

export function calculateTotalRacks(racks: Rack[]): number {
  return filterCompleted(racks).length
}

// ─── Session Statistics ───────────────────────────────────────────────────────

export function calculateSessionStatistics(
  sessionId: string,
  sessionNumber: number,
  allRacks: Rack[],
  mode: GameMode,
  drill: Drill,
  variant: Variant
): SessionStats | null {
  const sessionRacks = filterBySession(allRacks, sessionId)
  const completed = filterByGroup(sessionRacks, mode, drill, variant)

  if (completed.length === 0) return null

  const durations = completed.map((r) => r.durationMs)
  const date = completed[0].startedAt.split('T')[0]

  return {
    sessionId,
    sessionNumber,
    date,
    mode,
    drill,
    variant,
    racks: completed.length,
    best: calculateBest(durations),
    average: calculateAverage(durations),
    median: calculateMedian(durations),
  }
}

// ─── Overall Statistics ───────────────────────────────────────────────────────

export function calculateOverallStatistics(
  allRacks: Rack[],
  mode: GameMode,
  drill: Drill,
  variant: Variant
): OverallStats {
  const completed = filterByGroup(allRacks, mode, drill, variant)
  const durations = completed.map((r) => r.durationMs)

  if (durations.length === 0) {
    return {
      mode,
      drill,
      variant,
      totalRacks: 0,
      personalBest: 0,
      average: 0,
      median: 0,
      bestAverage5: null,
      consistency: null,
    }
  }

  return {
    mode,
    drill,
    variant,
    totalRacks: durations.length,
    personalBest: calculateBest(durations),
    average: calculateAverage(durations),
    median: calculateMedian(durations),
    bestAverage5: calculateBestAverage5(durations),
    consistency: calculateConsistency(durations),
  }
}

// ─── All Session Stats for a Group ───────────────────────────────────────────

export function getSessionStatsForGroup(
  allRacks: Rack[],
  sessions: Array<{ id: string; sessionNumber: number }>,
  mode: GameMode,
  drill: Drill,
  variant: Variant
): SessionStats[] {
  const results: SessionStats[] = []

  for (const session of sessions) {
    const stats = calculateSessionStatistics(
      session.id,
      session.sessionNumber,
      allRacks,
      mode,
      drill,
      variant
    )
    if (stats) results.push(stats)
  }

  return results.sort((a, b) => b.date.localeCompare(a.date))
}

// ─── Storage Summary ─────────────────────────────────────────────────────────

export function getStorageSummary(
  sessions: Array<{ id: string }>,
  racks: Rack[]
): { totalSessions: number; totalRacks: number } {
  return {
    totalSessions: sessions.length,
    totalRacks: filterCompleted(racks).length,
  }
}
