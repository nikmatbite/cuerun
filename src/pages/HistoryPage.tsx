import React, { useState, useMemo } from 'react'
import { Session, Rack, GameMode, Drill, Variant } from '@/types'
import { useData } from '@/hooks/useData'
import { modeLabel, drillLabel, variantLabel, groupDateLabel, formatDate } from '@/utils'
import { formatMs, formatMsShort } from '@/timer/timerEngine'
import { calculateSessionStatistics } from '@/statistics/stats'
import { getDB } from '@/database/db'

async function deleteRack(rackId: string): Promise<void> {
  const db = await getDB()
  await db.delete('racks', rackId)
}

export default function HistoryPage() {
  const { sessions, racks, loading, reload } = useData()
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Rack | null>(null)
  const [deleting, setDeleting] = useState(false)

  const grouped = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const map = new Map<string, Session[]>()
    for (const s of sorted) {
      const date = s.createdAt.split('T')[0]
      if (!map.has(date)) map.set(date, [])
      map.get(date)!.push(s)
    }
    return Array.from(map.entries())
  }, [sessions])

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    await deleteRack(confirmDelete.id)
    setConfirmDelete(null)
    setDeleting(false)
    await reload()
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
        <div className="text-4xl mb-4">🕐</div>
        <div className="font-sans font-semibold text-text-primary mb-2">Belum ada sesi</div>
        <div className="text-text-muted text-sm">Riwayat sesi akan muncul di sini setelah kamu bermain.</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-6 pb-4">
      <h1 className="font-sans font-bold text-text-primary text-2xl px-2 mb-6">Riwayat</h1>

      <div className="space-y-6">
        {grouped.map(([date, dateSessions]) => (
          <div key={date}>
            <div className="font-mono text-text-muted text-xs tracking-[0.15em] uppercase px-2 mb-3">
              {groupDateLabel(date)}
            </div>
            <div className="space-y-2">
              {dateSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  racks={racks}
                  expanded={expandedSession === session.id}
                  onToggle={() =>
                    setExpandedSession((prev) => (prev === session.id ? null : session.id))
                  }
                  onDeleteRack={setConfirmDelete}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => !deleting && setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-lg bg-surface-2 border border-border rounded-t-2xl p-6 pb-10 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-sans font-semibold text-text-primary text-base">Hapus rack ini?</h2>
            <p className="text-text-secondary text-sm leading-relaxed">
              {modeLabel(confirmDelete.mode)} · {drillLabel(confirmDelete.drill)}
              {confirmDelete.variant ? ` · ${variantLabel(confirmDelete.variant)}` : ''}{' '}
              {confirmDelete.status === 'completed'
                ? `— ${formatMs(confirmDelete.durationMs)}`
                : '(Dibatalkan)'}
              <br />
              <span className="text-text-muted">Data ini akan dihapus permanen dan tidak bisa dikembalikan.</span>
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="w-full py-3.5 rounded-xl font-sans font-semibold text-sm bg-surface-3 text-text-secondary border border-border active:bg-surface-2 disabled:opacity-40"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="w-full py-3.5 rounded-xl font-sans font-semibold text-sm bg-danger/10 text-danger border border-danger/30 active:bg-danger/20 disabled:opacity-40"
              >
                {deleting ? 'Menghapus…' : 'Hapus Rack'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SessionCard({
  session,
  racks,
  expanded,
  onToggle,
  onDeleteRack,
}: {
  session: Session
  racks: Rack[]
  expanded: boolean
  onToggle: () => void
  onDeleteRack: (rack: Rack) => void
}) {
  const sessionRacks = useMemo(
    () => racks.filter((r) => r.sessionId === session.id &&
      (r.status === 'completed' || r.status === 'abandoned')),
    [racks, session.id]
  )

  const completedRacks = sessionRacks.filter((r) => r.status === 'completed')
  const abandonedRacks = sessionRacks.filter((r) => r.status === 'abandoned')

  const groups = useMemo(() => {
    const seen = new Set<string>()
    const result: Array<{ mode: GameMode; drill: Drill; variant: Variant }> = []
    for (const r of completedRacks) {
      const key = `${r.mode}|${r.drill}|${r.variant}`
      if (!seen.has(key)) {
        seen.add(key)
        result.push({ mode: r.mode, drill: r.drill, variant: r.variant })
      }
    }
    return result
  }, [completedRacks])

  return (
    <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 text-left flex items-center justify-between active:bg-surface-3 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-accent text-xs font-semibold">
              Sesi #{session.sessionNumber}
            </span>
            <span className="text-text-muted text-xs">{formatDate(session.createdAt)}</span>
          </div>
          <div className="text-text-secondary text-sm truncate">
            {completedRacks.length} rack selesai
            {abandonedRacks.length > 0 && (
              <span className="ml-1.5 text-text-muted">· {abandonedRacks.length} dibatalkan</span>
            )}
            {groups.length > 0 && (
              <span className="ml-1.5 text-text-muted">
                · {groups.map((g) => modeLabel(g.mode)).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
              </span>
            )}
          </div>
        </div>
        <div className={`text-text-muted ml-3 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border divide-y divide-border/50">
          {sessionRacks.length === 0 ? (
            <div className="px-5 py-4 text-text-muted text-sm">Tidak ada rack di sesi ini.</div>
          ) : (
            <>
              {groups.map((g, i) => (
                <GroupDetail
                  key={i}
                  session={session}
                  group={g}
                  racks={racks}
                  onDeleteRack={onDeleteRack}
                />
              ))}
              {abandonedRacks.length > 0 && (
                <AbandonedSection
                  abandonedRacks={abandonedRacks}
                  onDeleteRack={onDeleteRack}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function GroupDetail({
  session,
  group,
  racks,
  onDeleteRack,
}: {
  session: Session
  group: { mode: GameMode; drill: Drill; variant: Variant }
  racks: Rack[]
  onDeleteRack: (rack: Rack) => void
}) {
  const stats = calculateSessionStatistics(
    session.id,
    session.sessionNumber,
    racks,
    group.mode,
    group.drill,
    group.variant
  )

  const groupRacks = useMemo(
    () =>
      racks
        .filter(
          (r) =>
            r.sessionId === session.id &&
            r.status === 'completed' &&
            r.mode === group.mode &&
            r.drill === group.drill &&
            r.variant === group.variant
        )
        .sort((a, b) => (a.startedAt > b.startedAt ? 1 : -1)),
    [racks, session.id, group]
  )

  if (!stats) return null

  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="font-mono text-accent text-xs font-semibold">{modeLabel(group.mode)}</div>
        <div className="text-text-muted text-xs">
          {drillLabel(group.drill)}
          {group.variant ? ` · ${variantLabel(group.variant)}` : ''}
        </div>
      </div>

      <div className="flex gap-4 mb-4 text-center">
        <div>
          <div className="font-mono text-text-primary font-semibold text-sm">{stats.racks}</div>
          <div className="text-text-muted text-xs">Rack</div>
        </div>
        <div>
          <div className="font-mono text-text-primary font-semibold text-sm">{formatMsShort(stats.best)}</div>
          <div className="text-text-muted text-xs">Terbaik</div>
        </div>
        <div>
          <div className="font-mono text-text-primary font-semibold text-sm">{formatMsShort(stats.average)}</div>
          <div className="text-text-muted text-xs">Rata-rata</div>
        </div>
        <div>
          <div className="font-mono text-text-primary font-semibold text-sm">{formatMsShort(stats.median)}</div>
          <div className="text-text-muted text-xs">Median</div>
        </div>
      </div>

      <div className="space-y-1.5">
        {groupRacks.map((rack, i) => (
          <div key={rack.id} className="flex items-center gap-2">
            <span className="text-text-muted font-mono text-xs w-14 flex-shrink-0">Rack {i + 1}</span>
            <span className={`font-mono text-sm flex-1 ${
              rack.durationMs === stats.best ? 'text-accent font-semibold' : 'text-text-secondary'
            }`}>
              {formatMs(rack.durationMs)}
            </span>
            <button
              onClick={() => onDeleteRack(rack)}
              className="text-text-muted active:text-danger transition-colors p-1.5 -mr-1 flex-shrink-0"
              aria-label="Hapus rack"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function AbandonedSection({
  abandonedRacks,
  onDeleteRack,
}: {
  abandonedRacks: Rack[]
  onDeleteRack: (rack: Rack) => void
}) {
  return (
    <div className="px-5 py-4">
      <div className="font-mono text-text-muted text-xs tracking-[0.15em] uppercase mb-3">
        Dibatalkan
      </div>
      <div className="space-y-1.5">
        {abandonedRacks.map((rack) => (
          <div key={rack.id} className="flex items-center gap-2">
            <span className="text-text-muted font-mono text-xs flex-1 truncate">
              {modeLabel(rack.mode)} · {drillLabel(rack.drill)}
              {rack.variant ? ` · ${variantLabel(rack.variant)}` : ''}
            </span>
            <button
              onClick={() => onDeleteRack(rack)}
              className="text-text-muted active:text-danger transition-colors p-1.5 -mr-1 flex-shrink-0"
              aria-label="Hapus rack"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}