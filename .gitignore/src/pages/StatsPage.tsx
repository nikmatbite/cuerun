import React, { useState, useEffect } from 'react'
import { GameMode, Drill, Variant, OverallStats } from '@/types'
import { modeLabel, drillLabel, variantLabel } from '@/utils'
import { formatMs } from '@/timer/timerEngine'
import { calculateOverallStatistics } from '@/statistics/stats'
import { useData } from '@/hooks/useData'

type GroupSelection =
  | { mode: '8ball'; drill: 'solo_rack'; variant: null }
  | { mode: '8ball'; drill: 'break_run'; variant: 'solids' }
  | { mode: '8ball'; drill: 'break_run'; variant: 'stripes' }
  | { mode: '9ball'; drill: 'full_rack'; variant: null }
  | { mode: '10ball'; drill: 'full_rack'; variant: null }

const GROUPS: GroupSelection[] = [
  { mode: '8ball', drill: 'solo_rack', variant: null },
  { mode: '8ball', drill: 'break_run', variant: 'solids' },
  { mode: '8ball', drill: 'break_run', variant: 'stripes' },
  { mode: '9ball', drill: 'full_rack', variant: null },
  { mode: '10ball', drill: 'full_rack', variant: null },
]

export default function StatsPage() {
  const { racks, loading } = useData()
  const [selected, setSelected] = useState<GroupSelection>(GROUPS[0])
  const [stats, setStats] = useState<OverallStats | null>(null)

  useEffect(() => {
    if (!loading) {
      const result = calculateOverallStatistics(racks, selected.mode, selected.drill, selected.variant)
      setStats(result)
    }
  }, [racks, selected, loading])

  const groupLabel = (g: GroupSelection) => {
    const parts = [modeLabel(g.mode)]
    if (g.drill !== 'full_rack') parts.push(drillLabel(g.drill))
    if (g.variant) parts.push(variantLabel(g.variant))
    return parts.join(' · ')
  }

  return (
    <div className="flex-1 flex flex-col px-4 pt-6 pb-4 overflow-y-auto">
      <h1 className="font-sans font-bold text-text-primary text-2xl px-2 mb-6">Statistik</h1>

      {/* Group Picker */}
      <div className="flex gap-2 overflow-x-auto pb-2 px-2 -mx-2 no-scrollbar mb-6">
        {GROUPS.map((g, i) => {
          const active =
            g.mode === selected.mode && g.drill === selected.drill && g.variant === selected.variant
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
              {selected.variant && (
                <span className="text-text-secondary font-normal ml-2">
                  · {variantLabel(selected.variant)}
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
  label,
  value,
  mono,
  accent,
  dim,
}: {
  label: string
  value: string
  mono?: boolean
  accent?: boolean
  dim?: boolean
}) {
  return (
    <div className="bg-surface-2 border border-border rounded-2xl px-5 py-4 flex items-center justify-between">
      <span className="font-sans text-text-secondary text-sm">{label}</span>
      <span
        className={`font-semibold text-base ${
          accent ? 'text-accent font-bold' : dim ? 'text-text-muted' : 'text-text-primary'
        } ${mono ? 'font-mono' : 'font-sans'}`}
      >
        {value}
      </span>
    </div>
  )
}

function ConsistencyCard({ score }: { score: number | null }) {
  const display = score !== null ? `${score} / 100` : 'Belum cukup data'
  const color = score === null ? 'text-text-muted' : score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-danger'
  const barWidth = score !== null ? `${score}%` : '0%'

  return (
    <div className="bg-surface-2 border border-border rounded-2xl px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-sans text-text-secondary text-sm">Konsistensi</span>
        <span className={`font-mono font-semibold text-base ${color}`}>{display}</span>
      </div>
      {score !== null && (
        <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              score >= 80 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-danger'
            }`}
            style={{ width: barWidth }}
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
        Selesaikan rack {modeLabel(group.mode)}
        {group.variant ? ` · ${variantLabel(group.variant)}` : ''} untuk melihat statistik di sini.
      </div>
    </div>
  )
}
