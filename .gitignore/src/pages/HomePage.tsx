import React, { useState } from 'react'
import { GameMode, Drill, Variant } from '@/types'
import { modeLabel, drillLabel } from '@/utils'
import { startNewSession, startNewRack } from '@/services/sessionService'

interface Props {
  onSessionStarted: (sessionId: string, rackId: string, mode: GameMode, drill: Drill, variant: Variant) => void
  existingSessionId: string | null
}

type SetupStep = 'mode' | 'drill' | 'variant'

export default function HomePage({ onSessionStarted, existingSessionId }: Props) {
  const [step, setStep] = useState<SetupStep>('mode')
  const [mode, setMode] = useState<GameMode | null>(null)
  const [drill, setDrill] = useState<Drill | null>(null)
  const [loading, setLoading] = useState(false)

  const handleMode = (m: GameMode) => {
    setMode(m)
    if (m === '8ball') {
      setStep('drill')
    } else {
      // 9ball / 10ball → Full Rack, no drill choice
      handleStart(m, 'full_rack', null)
    }
  }

  const handleDrill = (d: Drill) => {
    setDrill(d)
    if (d === 'break_run') {
      setStep('variant')
    } else {
      handleStart(mode!, d, null)
    }
  }

  const handleVariant = (v: Variant) => {
    handleStart(mode!, drill!, v)
  }

  const handleStart = async (m: GameMode, d: Drill, v: Variant) => {
    setLoading(true)
    try {
      let sessionId = existingSessionId
      if (!sessionId) {
        const session = await startNewSession()
        sessionId = session.id
      }
      const rack = await startNewRack(sessionId, m, d, v)
      onSessionStarted(sessionId, rack.id, m, d, v)
    } finally {
      setLoading(false)
    }
  }

  const back = () => {
    if (step === 'variant') setStep('drill')
    else if (step === 'drill') { setStep('mode'); setMode(null) }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col px-6 pt-10 pb-4">
      {/* Header */}
      <div className="mb-10">
        {step !== 'mode' && (
          <button
            onClick={back}
            className="flex items-center gap-1.5 text-text-secondary text-sm mb-6 -ml-1 active:text-text-primary"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Kembali
          </button>
        )}

        <div className="font-mono text-accent text-xs font-semibold tracking-[0.2em] uppercase mb-2">
          {existingSessionId ? 'Sesi Aktif' : 'CueRun'}
        </div>

        <h1 className="font-sans font-bold text-text-primary text-2xl leading-tight">
          {step === 'mode' && 'Pilih Mode'}
          {step === 'drill' && (
            <>
              <span className="text-accent">{mode && modeLabel(mode)}</span>
              <br />Pilih Drill
            </>
          )}
          {step === 'variant' && (
            <>
              <span className="text-accent">Break & Run</span>
              <br />Pilih Grup
            </>
          )}
        </h1>
      </div>

      {/* Step: Mode */}
      {step === 'mode' && (
        <div className="flex flex-col gap-3">
          {(['8ball', '9ball', '10ball'] as GameMode[]).map((m) => (
            <ModeButton
              key={m}
              label={modeLabel(m)}
              subtitle={m === '8ball' ? 'Solo Rack · Break & Run' : 'Full Rack'}
              onClick={() => handleMode(m)}
            />
          ))}
        </div>
      )}

      {/* Step: Drill (8 Ball only) */}
      {step === 'drill' && (
        <div className="flex flex-col gap-3">
          <ModeButton
            label="Solo Rack"
            subtitle="Mainkan kedua sisi. Bersihkan solids + stripes + 8."
            onClick={() => handleDrill('solo_rack')}
          />
          <ModeButton
            label="Break & Run"
            subtitle="Bersihkan satu grup + 8."
            onClick={() => handleDrill('break_run')}
          />
        </div>
      )}

      {/* Step: Variant (Break & Run only) */}
      {step === 'variant' && (
        <div className="flex flex-col gap-3">
          <ModeButton
            label="Solids"
            subtitle="Bersihkan solids lalu tutup dengan 8."
            onClick={() => handleVariant('solids')}
          />
          <ModeButton
            label="Stripes"
            subtitle="Bersihkan stripes lalu tutup dengan 8."
            onClick={() => handleVariant('stripes')}
          />
        </div>
      )}
    </div>
  )
}

function ModeButton({ label, subtitle, onClick }: { label: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-surface-2 border border-border rounded-2xl p-5 text-left active:bg-surface-3 transition-colors group"
    >
      <div className="font-sans font-bold text-text-primary text-lg group-active:text-accent transition-colors">{label}</div>
      <div className="text-text-muted text-sm mt-0.5">{subtitle}</div>
    </button>
  )
}
