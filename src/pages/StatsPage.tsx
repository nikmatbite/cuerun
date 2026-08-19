import React, { useState, useEffect } from 'react'
import { GameMode, Drill, OverallStats } from '@/types'
import { modeLabel, drillLabel } from '@/utils'
import { formatMs } from '@/timer/timerEngine'
import { calculateOverallStatistics, calculateOverallStatisticsMerged } from '@/statistics/stats'
import { useData } from '@/hooks/useData'

type GroupSelection =
  | { mode: '8ball'; drill: 'solo_rack'; variant: null; merged: false }
  | { mode: '8ball'; drill: 'break_run'; variant: null; merged: true }
  | { mode: '9ball'; drill: 'full_rack'; variant: null; merged: false }
  | { mode: '10ball'; drill: 'full_rack'; variant: null; merged: false }

const GROUPS: GroupSelection[] = [
  { mode: '8ball', drill: 'solo_rack',  variant: null, merged: false },
  { mode: '8ball', drill: 'break_run',  variant: null, merged: true  },
  { mode: '9ball', drill: 'full_rack',  variant: null, merged: false },
  { mode: '10ball', drill: 'full_rack', variant: null, merged: false },
]

const STAT_INFO: { key: string; label: string; desc: string }[] = [
  {
    key: 'total',
    label: 'Total Rack',
    desc: 'Jumlah rack yang sudah kamu selesaikan (berstatus completed) untuk mode ini.',
  },
  {
    key: 'pb',
    label: 'Personal Best',
    desc: 'Waktu tercepat dari semua rack yang pernah kamu selesaikan di mode ini.',
  },
  {
    key: 'avg',
    label: 'Rata-rata',
    desc: 'Rata-rata waktu dari seluruh rack yang sudah selesai. Semakin rendah, semakin baik.',
  },
  {
    key: 'median',
    label: 'Median',
    desc: 'Nilai tengah dari semua waktu rack. Lebih tahan terhadap outlier dibanding rata-rata — cocok untuk melihat performa "tipikal" kamu.',
  },
  {
    key: 'ba5',
    label: 'Best Avg (5)',
    desc: 'Rata-rata terbaik dari 5 rack berturutan. Mengukur performa konsisten terbaik kamu dalam satu rangkaian — bukan hanya satu momen bagus.',
  },
  {
    key: 'consistency',
    label: 'Konsistensi',
    desc: 'Seberapa stabil waktu rack-rack kamu. Dihitung dari Coefficient of Variation (CV) — semakin kecil variasinya, semakin tinggi skornya. 100% = sempurna konsisten. Butuh minimal 3 rack untuk dihitung.',
  },
]

function consistencyLabel(score: number): string {
  if (score >= 85) return 'Sangat Konsisten'
  if (score >= 70) return 'Konsisten'
  if (score >= 50) return 'Cukup'
  if (score >= 30) return 'Perlu Latihan'
  return 'Tidak Konsisten'
}

export default function StatsPage() {
  const { racks, loading } = useData()
  const [selected, setSelected] = useState<GroupSelection>(GROUPS[0])
  const [stats, setStats] = useState<OverallStats | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    if (!loading) {
      const result = selected.merged
        ? calculateOverallStatisticsMerged(racks, selected.mode, selected.drill)
        : calculateOverallStatistics(racks, selected.mode, selected.drill, selected.variant)
      setStats(result)
    }
  }, [racks, selected, loading])

  const groupLabel = (g: GroupSelection) => {
    if (g.merged) return `${modeLabel(g.mode)} · ${drillLabel(g.drill)}`
    return `${modeLabel(g.mode)}${g.drill !== 'full_rack' ? ` · ${drillLabel(g.drill)}` : ''}`
  }

  return (
    <div className="flex-1 flex flex-col px-4 pt-6 pb-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-2 mb-6">
        <h1 className="font-sans font-bold text-text-primary text-2xl">Statistik</h1>
        <button
          onClick={() => setShowGuide((v) => !v)}
          className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${
            showGuide
              ? 'bg-accent border-accent text-surface'
              : 'bg-surface-2 border-border text-text-muted active:text-text-primary'
          }`}
          aria-label="Panduan statistik"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </button>
      </div>

      {/* Accordion Guide */}
      {showGuide && (
        <div className="mx-2 mb-5 bg-surface-2 border border-border rounded-2xl overflow-hidden">
          <div className="px-5 pt-4 pb-2">
            <p className="font-sans font-semibold text-text-primary text-sm mb-3">
              Panduan Statistik
            </p>
          </div>
          <div className="divide-y divide-border">
            {STAT_INFO.map((item) => (
              <div key={item.key} className="px-5 py-3">
                <p className="font-sans font-semibold text-text-primary text-xs mb-0.5">
                  {item.label}
                </p>
                <p className="font-sans text-text-muted text-xs leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
          <div className="px-5 py-3">
            <button
              onClick={() => setShowGuide(false)}
              className="text-accent text-xs font-semibold font-sans"
            >
              Tutup ↑
            </button>
          </div>
        </div>
      )}

      {/* Group Picker */}
      <div className="flex gap-2 overflow-x-auto pb-2 px-2 -mx-2 no-scrollbar mb-6">
        {GROUPS.map((g, i) => {
          const active = g.mode === selected.mode && g.drill === selected.drill
          return (
            <button
              key={i}
              onClick={() => setSelected(g)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-sans font-semibold whitespace-nowrap border transition-colors ${
                active
                  ? 'bg-accent text-surface border-accent'
                  : 'bg-surface-2 text-text-secondary border-border'
              }`}
            >
              {groupLabel(g)}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stats && stats.totalRacks > 0 ? (
        <div className="space-y-3 px-2">
          {/* Mode header */}
          <div className="bg-surface-2 border border-border rounded-2xl px-5 py-4 mb-2">
            <div className="font-mono text-accent text-xs tracking-[0.2em] uppercase mb-1">
              {modeLabel(selected.mode)}
            </div>
            <div className="font-sans font-bold text-text-primary text-lg">
              {drillLabel(selected.drill)}
              {selected.merged && (
                <span className="text-text-secondary font-normal ml-2 text-base">
                  · Solids / Stripes
                </span>
              )}
            </div>
          </div>

          <StatCard label="Total Rack" value={String(stats.totalRacks)} accent />
          <StatCard label="Personal Best" value={formatMs(stats.personalBest)} mono />
          <StatCard label="Rata-rata" value={formatMs(stats.average)} mono />
          <StatCard label="Median" value={formatMs(stats.median)} mono />
          <StatCard
            label="Best Avg (5)"
            value={stats.bestAverage5 !== null ? formatMs(stats.bestAverage5) : 'Belum cukup data'}
            mono
            dim={stats.bestAverage5 === null}
          />
          <ConsistencyCard score={stats.consistency} />
        </div>
      ) : (
        <EmptyState group={selected} />
      )}
    </div>
  )
}

function StatCard({
  label, value, mono, accent, dim,
}: {
  label: string; value: string; mono?: boolean; accent?: boolean; dim?: boolean
}) {
  return (
    <div className="bg-surface-2 border border-border rounded-2xl px-5 py-4 flex items-center justify-between">
      <span className="font-sans text-text-secondary text-sm">{label}</span>
      <span className={`font-semibold text-base ${
        accent ? 'text-accent font-bold' : dim ? 'text-text-muted' : 'text-text-primary'
      } ${mono ? 'font-mono' : 'font-sans'}`}>
        {value}
      </span>
    </div>
  )
}

function ConsistencyCard({ score }: { score: number | null }) {
  const pct = score !== null ? `${score}%` : null
  const label = score !== null ? consistencyLabel(score) : null
  const color = score === null
    ? 'text-text-muted'
    : score >= 85 ? 'text-success'
    : score >= 70 ? 'text-success'
    : score >= 50 ? 'text-warning'
    : 'text-danger'
  const barColor = score === null
    ? ''
    : score >= 70 ? 'bg-success'
    : score >= 50 ? 'bg-warning'
    : 'bg-danger'

  return (
    <div className="bg-surface-2 border border-border rounded-2xl px-5 py-4">
      <div className="flex items-center justify-between mb-1">
        <span className="font-sans text-text-secondary text-sm">Konsistensi</span>
        {score !== null ? (
          <div className="flex items-center gap-2">
            <span className={`font-sans text-xs ${color}`}>{label}</span>
            <span className={`font-mono font-bold text-base ${color}`}>{pct}</span>
          </div>
        ) : (
          <span className="font-sans text-text-muted text-sm">Belum cukup data</span>
        )}
      </div>
      {score !== null && (
        <div className="mt-2 h-1.5 bg-surface-3 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${score}%` }}
          />
        </div>
      )}
    </div>
  )
}

function EmptyState({ group }: { group: GroupSelection }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-16">
      <div className="text-4xl mb-4">🎱</div>
      <div className="font-sans font-semibold text-text-primary mb-2">Belum ada data</div>
      <div className="text-text-muted text-sm leading-relaxed">
        Selesaikan rack {modeLabel(group.mode)} · {drillLabel(group.drill)}{' '}
        {group.merged ? '(Solids atau Stripes)' : ''} untuk melihat statistik di sini.
      </div>
    </div>
  )
}