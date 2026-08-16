import { getAllSessions, getAllRacks, importData, getMeta, setMeta } from '@/database/db'
import { BackupFile, Session, Rack, GameMode, Drill, Variant } from '@/types'

const BACKUP_VERSION = 1
const VALID_MODES: GameMode[] = ['8ball', '9ball', '10ball']
const VALID_DRILLS: Drill[] = ['solo_rack', 'break_run', 'full_rack']
const VALID_VARIANTS: (Variant)[] = ['solids', 'stripes', null]
const VALID_STATUSES = ['running', 'paused', 'completed', 'abandoned']

// ─── Export ──────────────────────────────────────────────────────────────────

export async function exportBackup(): Promise<BackupFile> {
  const sessions = await getAllSessions()
  const racks = await getAllRacks()

  const backup: BackupFile = {
    app: 'CueRun',
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    sessions,
    racks,
  }

  await setMeta('last_backup', new Date().toISOString())
  return backup
}

export async function downloadBackup(): Promise<void> {
  const backup = await exportBackup()
  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const date = new Date().toISOString().split('T')[0]
  const filename = `cuerun-backup-${date}.json`

  // Try Web Share API (mobile)
  if (navigator.canShare && navigator.share) {
    const file = new File([blob], filename, { type: 'application/json' })
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: 'CueRun Backup',
        text: `CueRun backup — ${date}`,
        files: [file],
      })
      return
    }
  }

  // Fallback: trigger download
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function getLastBackupTime(): Promise<string | null> {
  const val = await getMeta('last_backup')
  return typeof val === 'string' ? val : null
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateBackup(raw: unknown): ValidationResult {
  const errors: string[] = []

  if (typeof raw !== 'object' || raw === null) {
    return { valid: false, errors: ['Invalid JSON: not an object'] }
  }

  const obj = raw as Record<string, unknown>

  if (obj['app'] !== 'CueRun') {
    errors.push('Not a CueRun backup file (wrong app name)')
  }

  if (obj['backupVersion'] !== BACKUP_VERSION) {
    errors.push(`Unsupported backup version: ${obj['backupVersion']}`)
  }

  if (!Array.isArray(obj['sessions'])) {
    errors.push('Missing or invalid sessions array')
  } else {
    ;(obj['sessions'] as unknown[]).forEach((s, i) => {
      if (typeof s !== 'object' || s === null) {
        errors.push(`Session[${i}]: not an object`)
        return
      }
      const session = s as Record<string, unknown>
      if (typeof session['id'] !== 'string') errors.push(`Session[${i}]: missing id`)
      if (typeof session['sessionNumber'] !== 'number') errors.push(`Session[${i}]: missing sessionNumber`)
      if (typeof session['startedAt'] !== 'string') errors.push(`Session[${i}]: missing startedAt`)
      if (typeof session['createdAt'] !== 'string') errors.push(`Session[${i}]: missing createdAt`)
    })
  }

  if (!Array.isArray(obj['racks'])) {
    errors.push('Missing or invalid racks array')
  } else {
    ;(obj['racks'] as unknown[]).forEach((r, i) => {
      if (typeof r !== 'object' || r === null) {
        errors.push(`Rack[${i}]: not an object`)
        return
      }
      const rack = r as Record<string, unknown>
      if (typeof rack['id'] !== 'string') errors.push(`Rack[${i}]: missing id`)
      if (typeof rack['sessionId'] !== 'string') errors.push(`Rack[${i}]: missing sessionId`)
      if (!VALID_MODES.includes(rack['mode'] as GameMode)) errors.push(`Rack[${i}]: invalid mode "${rack['mode']}"`)
      if (!VALID_DRILLS.includes(rack['drill'] as Drill)) errors.push(`Rack[${i}]: invalid drill "${rack['drill']}"`)
      if (!VALID_VARIANTS.includes(rack['variant'] as Variant)) errors.push(`Rack[${i}]: invalid variant "${rack['variant']}"`)
      if (typeof rack['durationMs'] !== 'number' || rack['durationMs'] < 0) errors.push(`Rack[${i}]: invalid durationMs`)
      if (typeof rack['startedAt'] !== 'string') errors.push(`Rack[${i}]: missing startedAt`)
      if (!VALID_STATUSES.includes(rack['status'] as string)) errors.push(`Rack[${i}]: invalid status "${rack['status']}"`)
    })
  }

  return { valid: errors.length === 0, errors }
}

// ─── Import ──────────────────────────────────────────────────────────────────

export interface ImportResult {
  success: boolean
  importedSessions: number
  importedRacks: number
  skipped: number
  errors: string[]
}

export async function importBackup(
  file: File,
  mode: 'merge' | 'replace'
): Promise<ImportResult> {
  const text = await file.text()

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { success: false, importedSessions: 0, importedRacks: 0, skipped: 0, errors: ['Invalid JSON file'] }
  }

  const validation = validateBackup(raw)
  if (!validation.valid) {
    return { success: false, importedSessions: 0, importedRacks: 0, skipped: 0, errors: validation.errors }
  }

  const backup = raw as BackupFile
  const result = await importData(backup.sessions as Session[], backup.racks as Rack[], mode)

  return {
    success: true,
    ...result,
    errors: [],
  }
}
