export { v4 as uuidv4 } from 'uuid'

import { GameMode, Drill, Variant } from '@/types'

// ─── Labels ──────────────────────────────────────────────────────────────────

export function modeLabel(mode: GameMode): string {
  switch (mode) {
    case '8ball': return '8 Ball'
    case '9ball': return '9 Ball'
    case '10ball': return '10 Ball'
  }
}

export function drillLabel(drill: Drill): string {
  switch (drill) {
    case 'solo_rack': return 'Solo Rack'
    case 'break_run': return 'Break & Run'
    case 'full_rack': return 'Full Rack'
  }
}

export function variantLabel(variant: Variant): string {
  if (!variant) return ''
  return variant === 'solids' ? 'Solids' : 'Stripes'
}

export function groupLabel(mode: GameMode, drill: Drill, variant: Variant): string {
  const parts = [modeLabel(mode), drillLabel(drill)]
  if (variant) parts.push(variantLabel(variant))
  return parts.join(' · ')
}

// ─── Date ────────────────────────────────────────────────────────────────────

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function isoToday(): string {
  return new Date().toISOString().split('T')[0]
}

export function groupDateLabel(isoDate: string): string {
  const today = isoToday()
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (isoDate === today) return 'Hari ini'
  if (isoDate === yesterday) return 'Kemarin'
  return formatDate(isoDate + 'T00:00:00')
}
