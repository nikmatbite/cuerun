// ─── Game Modes & Drills ────────────────────────────────────────────────────

export type GameMode = '8ball' | '9ball' | '10ball'

export type Drill =
  | 'solo_rack'    // 8 Ball only
  | 'break_run'    // 8 Ball only
  | 'full_rack'    // 9 Ball, 10 Ball

export type Variant =
  | 'solids'       // 8 Ball Break & Run
  | 'stripes'      // 8 Ball Break & Run
  | null           // All other drills

// ─── Stats Group ────────────────────────────────────────────────────────────

export interface StatsGroup {
  mode: GameMode
  drill: Drill
  variant: Variant
}

// ─── Session ────────────────────────────────────────────────────────────────

export interface Session {
  id: string
  sessionNumber: number
  startedAt: string       // ISO 8601
  endedAt: string | null  // ISO 8601
  createdAt: string       // ISO 8601
}

// ─── Rack ───────────────────────────────────────────────────────────────────

export type RackStatus = 'running' | 'paused' | 'completed' | 'abandoned'

export interface Rack {
  id: string
  sessionId: string
  mode: GameMode
  drill: Drill
  variant: Variant
  durationMs: number      // Accumulated ms, excluding pause time
  startedAt: string       // ISO 8601
  completedAt: string | null  // ISO 8601
  status: RackStatus
  // For timer recovery: tracks when the rack was last paused/resumed
  pausedAt: string | null     // ISO 8601 — set when paused
  resumedAt: string | null    // ISO 8601 — set when resumed (or started)
}

// ─── Timer State ─────────────────────────────────────────────────────────────

export type TimerState = 'idle' | 'running' | 'paused' | 'finished'

export interface ActiveTimerContext {
  rackId: string
  sessionId: string
  mode: GameMode
  drill: Drill
  variant: Variant
  timerState: TimerState
  startedAt: string       // ISO 8601 of rack start
  pausedAt: string | null // ISO 8601 — null if running
  accumulatedMs: number   // ms before current running segment
}

// ─── Statistics ──────────────────────────────────────────────────────────────

export interface SessionStats {
  sessionId: string
  sessionNumber: number
  date: string            // YYYY-MM-DD
  mode: GameMode
  drill: Drill
  variant: Variant
  racks: number
  best: number            // ms
  average: number         // ms
  median: number          // ms
}

export interface OverallStats {
  mode: GameMode
  drill: Drill
  variant: Variant
  totalRacks: number
  personalBest: number    // ms
  average: number         // ms
  median: number          // ms
  bestAverage5: number | null  // ms — null if < 5 racks
  consistency: number | null   // 0–100 — null if < 5 racks
}

// ─── Backup ──────────────────────────────────────────────────────────────────

export interface BackupFile {
  app: string
  backupVersion: number
  exportedAt: string      // ISO 8601
  sessions: Session[]
  racks: Rack[]
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export type AppPage = 'home' | 'timer' | 'stats' | 'history' | 'settings'

export type SetupStep =
  | 'choose_mode'
  | 'choose_drill'    // 8 Ball only
  | 'choose_variant'  // 8 Ball Break & Run only
