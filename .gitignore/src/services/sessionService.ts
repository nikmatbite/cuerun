import { v4 as uuidv4 } from 'uuid'
import {
  createSession,
  updateSession,
  getAllSessions,
  getNextSessionNumber,
  createRack,
  updateRack,
  getRack,
  getRacksBySession,
  getAllRacks,
  getActiveRack,
} from '@/database/db'
import { Session, Rack, GameMode, Drill, Variant } from '@/types'

// ─── Session ─────────────────────────────────────────────────────────────────

export async function startNewSession(): Promise<Session> {
  const sessionNumber = await getNextSessionNumber()
  const now = new Date().toISOString()
  const session: Session = {
    id: uuidv4(),
    sessionNumber,
    startedAt: now,
    endedAt: null,
    createdAt: now,
  }
  await createSession(session)
  return session
}

export async function endSession(sessionId: string): Promise<void> {
  const sessions = await getAllSessions()
  const session = sessions.find((s) => s.id === sessionId)
  if (!session) return
  await updateSession({ ...session, endedAt: new Date().toISOString() })
}

export { getAllSessions }

// ─── Rack ────────────────────────────────────────────────────────────────────

export async function startNewRack(
  sessionId: string,
  mode: GameMode,
  drill: Drill,
  variant: Variant
): Promise<Rack> {
  const now = new Date().toISOString()
  const rack: Rack = {
    id: uuidv4(),
    sessionId,
    mode,
    drill,
    variant,
    durationMs: 0,
    startedAt: now,
    completedAt: null,
    status: 'running',
    pausedAt: null,
    resumedAt: now,
  }
  await createRack(rack)
  return rack
}

export async function pauseRack(rackId: string): Promise<Rack | undefined> {
  const rack = await getRack(rackId)
  if (!rack || rack.status !== 'running') return rack

  const now = new Date().toISOString()
  const nowMs = Date.now()
  const resumedAtMs = rack.resumedAt ? new Date(rack.resumedAt).getTime() : new Date(rack.startedAt).getTime()
  const segmentMs = nowMs - resumedAtMs
  const accumulated = rack.durationMs + segmentMs

  const updated: Rack = {
    ...rack,
    status: 'paused',
    pausedAt: now,
    durationMs: accumulated,
  }
  await updateRack(updated)
  return updated
}

export async function resumeRack(rackId: string): Promise<Rack | undefined> {
  const rack = await getRack(rackId)
  if (!rack || rack.status !== 'paused') return rack

  const now = new Date().toISOString()
  const updated: Rack = {
    ...rack,
    status: 'running',
    pausedAt: null,
    resumedAt: now,
  }
  await updateRack(updated)
  return updated
}

export async function completeRack(rackId: string, finalDurationMs: number): Promise<Rack | undefined> {
  const rack = await getRack(rackId)
  if (!rack) return undefined

  const now = new Date().toISOString()
  const updated: Rack = {
    ...rack,
    status: 'completed',
    durationMs: finalDurationMs,
    completedAt: now,
    pausedAt: null,
  }
  await updateRack(updated)
  return updated
}

export async function abandonRack(rackId: string): Promise<void> {
  const rack = await getRack(rackId)
  if (!rack) return
  await updateRack({ ...rack, status: 'abandoned' })
}

export { getActiveRack, getRack, getRacksBySession, getAllRacks }
