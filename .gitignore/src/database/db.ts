import { openDB, IDBPDatabase } from 'idb'
import { Session, Rack } from '@/types'

const DB_NAME = 'cuerun-db'
const DB_VERSION = 1

export interface CueRunDB {
  sessions: {
    key: string
    value: Session
    indexes: { 'by-created': string }
  }
  racks: {
    key: string
    value: Rack
    indexes: {
      'by-session': string
      'by-status': string
      'by-mode-drill-variant': [string, string, string | null]
    }
  }
  meta: {
    key: string
    value: { key: string; value: string | number }
  }
}

let dbInstance: IDBPDatabase<CueRunDB> | null = null

export async function getDB(): Promise<IDBPDatabase<CueRunDB>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<CueRunDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Sessions store
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' })
        sessionsStore.createIndex('by-created', 'createdAt')
      }

      // Racks store
      if (!db.objectStoreNames.contains('racks')) {
        const racksStore = db.createObjectStore('racks', { keyPath: 'id' })
        racksStore.createIndex('by-session', 'sessionId')
        racksStore.createIndex('by-status', 'status')
        racksStore.createIndex('by-mode-drill-variant', ['mode', 'drill', 'variant'])
      }

      // Meta store (for sequence counters, last backup time, etc.)
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' })
      }
    },
  })

  return dbInstance
}

// ─── Session Operations ──────────────────────────────────────────────────────

export async function createSession(session: Session): Promise<void> {
  const db = await getDB()
  await db.put('sessions', session)
}

export async function getSession(id: string): Promise<Session | undefined> {
  const db = await getDB()
  return db.get('sessions', id)
}

export async function getAllSessions(): Promise<Session[]> {
  const db = await getDB()
  return db.getAllFromIndex('sessions', 'by-created')
}

export async function updateSession(session: Session): Promise<void> {
  const db = await getDB()
  await db.put('sessions', session)
}

// ─── Rack Operations ─────────────────────────────────────────────────────────

export async function createRack(rack: Rack): Promise<void> {
  const db = await getDB()
  await db.put('racks', rack)
}

export async function getRack(id: string): Promise<Rack | undefined> {
  const db = await getDB()
  return db.get('racks', id)
}

export async function updateRack(rack: Rack): Promise<void> {
  const db = await getDB()
  await db.put('racks', rack)
}

export async function getRacksBySession(sessionId: string): Promise<Rack[]> {
  const db = await getDB()
  return db.getAllFromIndex('racks', 'by-session', sessionId)
}

export async function getAllRacks(): Promise<Rack[]> {
  const db = await getDB()
  return db.getAll('racks')
}

export async function getActiveRack(): Promise<Rack | undefined> {
  const db = await getDB()
  const running = await db.getAllFromIndex('racks', 'by-status', 'running')
  if (running.length > 0) return running[0]
  const paused = await db.getAllFromIndex('racks', 'by-status', 'paused')
  if (paused.length > 0) return paused[0]
  return undefined
}

// ─── Meta Operations ─────────────────────────────────────────────────────────

export async function getMeta(key: string): Promise<string | number | undefined> {
  const db = await getDB()
  const entry = await db.get('meta', key)
  return entry?.value
}

export async function setMeta(key: string, value: string | number): Promise<void> {
  const db = await getDB()
  await db.put('meta', { key, value })
}

export async function getNextSessionNumber(): Promise<number> {
  const current = (await getMeta('session_counter')) as number | undefined
  const next = (current ?? 0) + 1
  await setMeta('session_counter', next)
  return next
}

// ─── Clear All Data ──────────────────────────────────────────────────────────

export async function clearAllData(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['sessions', 'racks', 'meta'], 'readwrite')
  await tx.objectStore('sessions').clear()
  await tx.objectStore('racks').clear()
  await tx.objectStore('meta').clear()
  await tx.done
}

// ─── Import / Restore ────────────────────────────────────────────────────────

export async function importData(
  sessions: Session[],
  racks: Rack[],
  mode: 'merge' | 'replace'
): Promise<{ importedSessions: number; importedRacks: number; skipped: number }> {
  const db = await getDB()

  if (mode === 'replace') {
    const tx = db.transaction(['sessions', 'racks', 'meta'], 'readwrite')
    await tx.objectStore('sessions').clear()
    await tx.objectStore('racks').clear()
    await tx.objectStore('meta').clear()
    await tx.done
  }

  let importedSessions = 0
  let importedRacks = 0
  let skipped = 0

  const sessionTx = db.transaction('sessions', 'readwrite')
  for (const session of sessions) {
    const existing = await sessionTx.store.get(session.id)
    if (!existing) {
      await sessionTx.store.put(session)
      importedSessions++
    } else {
      skipped++
    }
  }
  await sessionTx.done

  const rackTx = db.transaction('racks', 'readwrite')
  for (const rack of racks) {
    const existing = await rackTx.store.get(rack.id)
    if (!existing) {
      await rackTx.store.put(rack)
      importedRacks++
    } else {
      skipped++
    }
  }
  await rackTx.done

  // Update session counter to max session number
  const allSessions = await getAllSessions()
  if (allSessions.length > 0) {
    const maxNum = Math.max(...allSessions.map((s) => s.sessionNumber))
    await setMeta('session_counter', maxNum)
  }

  return { importedSessions, importedRacks, skipped }
}
