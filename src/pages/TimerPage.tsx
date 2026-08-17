import React, { useState, useEffect, useRef } from 'react'
import { GameMode, Drill, Variant } from '@/types'
import { useTimer } from '@/hooks/useTimer'
import { formatMs, formatMsShort } from '@/timer/timerEngine'
import { modeLabel, drillLabel, variantLabel } from '@/utils'
import {
  pauseRack,
  resumeRack,
  completeRack,
  abandonRack,
  startNewRack,
  getActiveRack,
} from '@/services/sessionService'
import Modal from '@/components/Modal'

type TimerPhase = 'idle' | 'running' | 'paused' | 'finished'
type ModalType = 'abandon' | 'recovery' | null

interface Props {
  sessionId: string
  initialRackId: string
  mode: GameMode
  drill: Drill
  variant: Variant
  onEndSession: () => void
  onChangeMode: () => void
  onRackCompleted: () => void
}

export default function TimerPage({
  sessionId,
  initialRackId,
  mode,
  drill,
  variant,
  onEndSession,
  onChangeMode,
  onRackCompleted,
}: Props) {
  const { elapsedMs, start, pause, resume, stop, resetToIdle, restoreFromRack } = useTimer()
  const [rackId, setRackId] = useState(initialRackId)
  const [rackCount, setRackCount] = useState(0)
  const [completedTimes, setCompletedTimes] = useState<number[]>([])
  const [phase, setPhase] = useState<TimerPhase>('idle')
  const [modal, setModal] = useState<ModalType>(null)
  const [finalMs, setFinalMs] = useState(0)
  const [recoveryChecked, setRecoveryChecked] = useState(false)
  const stoppingRef = useRef(false)

  // Check for recovery on mount
  useEffect(() => {
    const checkRecovery = async () => {
      const active = await getActiveRack()

      const isStaleRack =
        active &&
        active.sessionId === sessionId &&
        (active.status === 'running' || active.status === 'paused') &&
        active.id !== initialRackId

      if (isStaleRack && active) {
        setRackId(active.id)
        restoreFromRack(active)

        if (active.status === 'paused') {
          // Rack di-pause user sebelumnya — tanya mau lanjut atau batalkan
          setPhase('paused')
          setModal('recovery')
        } else {
          // Rack sedang running — auto-resume langsung tanpa modal
          // Timer engine sudah timestamp-based, jadi elapsed otomatis akurat
          // termasuk waktu saat HP layar mati
          setPhase('running')
        }
      } else {
        // Fresh start — tunggu user klik Start
        setPhase('idle')
      }
      setRecoveryChecked(true)
    }
    checkRecovery()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset ke idle saat mode/rack baru dipilih (ganti mode dari luar)
  useEffect(() => {
    if (!recoveryChecked) return  // tunggu recovery check selesai dulu
    setRackId(initialRackId)
    setPhase('idle')
    setFinalMs(0)
    setRackCount(0)
    setCompletedTimes([])
    resetToIdle()
  }, [initialRackId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePause = async () => {
    pause()
    setPhase('paused')
    await pauseRack(rackId)
  }

  const handleResume = async () => {
    resume()
    setPhase('running')
    await resumeRack(rackId)
  }

  const handleStop = async () => {
    if (stoppingRef.current) return
    stoppingRef.current = true
    const elapsed = elapsedMs
    stop()
    setPhase('finished')
    setFinalMs(elapsed)
    setRackCount((c) => c + 1)
    setCompletedTimes((prev) => [...prev, elapsed])
    await completeRack(rackId, elapsed)
    onRackCompleted()
    stoppingRef.current = false
  }

  const handleNextRack = async () => {
    const rack = await startNewRack(sessionId, mode, drill, variant)
    setRackId(rack.id)
    resetToIdle()
    setPhase('idle')
  }

  const handleAbandonConfirm = async () => {
    setModal(null)
    await abandonRack(rackId)
    resetToIdle()
    const rack = await startNewRack(sessionId, mode, drill, variant)
    setRackId(rack.id)
    setPhase('idle')
  }

  const handleRecoveryContinue = async () => {
    setModal(null)
    await resumeRack(rackId)
    resume()
    setPhase('running')
  }

  const handleRecoveryAbandon = async () => {
    setModal(null)
    await abandonRack(rackId)
    const rack = await startNewRack(sessionId, mode, drill, variant)
    setRackId(rack.id)
    resetToIdle()
    setPhase('idle')
  }

  const sessionBest = completedTimes.length > 0 ? Math.min(...completedTimes) : null

  if (!recoveryChecked) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-between mb-1">
          <div className="font-mono text-accent text-xs font-semibold tracking-[0.15em] uppercase">
            {modeLabel(mode)}
          </div>
          <button
            onClick={onChangeMode}
            className="text-text-muted text-xs font-sans active:text-text-secondary"
          >
            Ganti Mode
          </button>
        </div>
        <div className="text-text-secondary text-sm font-sans">
          {drillLabel(drill)}{variant ? ` · ${variantLabel(variant)}` : ''}
        </div>
      </div>

      {/* Timer Display */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-2">
        <div className={`text-xs font-mono tracking-[0.3em] uppercase mb-4 h-4 ${
          phase === 'running' ? 'text-accent' :
          phase === 'paused' ? 'text-warning' :
          phase === 'finished' ? 'text-success' :
          'text-text-muted'
        }`}>
          {phase === 'running' && '● BERJALAN'}
          {phase === 'paused' && '⏸ JEDA'}
          {phase === 'finished' && '✓ SELESAI'}
          {phase === 'idle' && '○ SIAP'}
        </div>

        <div
          className={`font-mono font-bold tracking-tight select-none transition-colors ${
            phase === 'finished' ? 'text-success' : 'text-text-primary'
          }`}
          style={{ fontSize: 'clamp(3rem, 16vw, 5.5rem)', lineHeight: 1.1 }}
        >
          {formatMs(phase === 'finished' ? finalMs : elapsedMs)}
        </div>

        <div className="text-text-muted font-mono text-xs tracking-widest mt-2">
          RACK #{rackCount + (phase === 'finished' ? 0 : 1)}
        </div>

        {sessionBest !== null && (
          <div className="text-text-muted font-mono text-xs mt-1">
            Terbaik sesi: {formatMsShort(sessionBest)}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-6 pb-6 space-y-3">
        {phase === 'idle' && (
          <button
            onClick={() => { start(); setPhase('running') }}
            className="w-full py-5 bg-accent rounded-2xl font-sans font-bold text-surface text-base active:bg-accent-dim transition-colors"
          >
            Mulai
          </button>
        )}

        {phase === 'running' && (
          <>
            <div className="flex gap-3">
              <button
                onClick={handlePause}
                className="flex-1 py-5 bg-surface-2 border border-border rounded-2xl font-sans font-semibold text-text-primary text-base active:bg-surface-3 transition-colors"
              >
                Jeda
              </button>
              <button
                onClick={handleStop}
                className="flex-1 py-5 bg-accent rounded-2xl font-sans font-bold text-surface text-base active:bg-accent-dim transition-colors"
              >
                Stop
              </button>
            </div>
            <button
              onClick={() => setModal('abandon')}
              className="w-full py-3 font-sans font-semibold text-danger/60 text-sm active:text-danger"
            >
              Batalkan Rack
            </button>
          </>
        )}

        {phase === 'paused' && (
          <>
            <div className="flex gap-3">
              <button
                onClick={handleResume}
                className="flex-1 py-5 bg-accent rounded-2xl font-sans font-bold text-surface text-base active:bg-accent-dim transition-colors"
              >
                Lanjut
              </button>
              <button
                onClick={handleStop}
                className="flex-1 py-5 bg-surface-2 border border-border rounded-2xl font-sans font-semibold text-text-primary text-base active:bg-surface-3 transition-colors"
              >
                Stop
              </button>
            </div>
            <button
              onClick={() => setModal('abandon')}
              className="w-full py-4 rounded-2xl font-sans font-semibold text-danger/80 text-sm active:text-danger"
            >
              Batalkan Rack
            </button>
          </>
        )}

        {phase === 'finished' && (
          <>
            <button
              onClick={handleNextRack}
              className="w-full py-5 bg-accent rounded-2xl font-sans font-bold text-surface text-base active:bg-accent-dim transition-colors"
            >
              Rack Berikutnya →
            </button>
            <button
              onClick={onChangeMode}
              className="w-full py-4 bg-surface-2 border border-border rounded-2xl font-sans font-semibold text-text-secondary text-sm active:bg-surface-3 transition-colors"
            >
              Ganti Mode / Akhiri Sesi
            </button>
          </>
        )}
      </div>

      {/* Modals */}
      {modal === 'abandon' && (
        <Modal
          title="Batalkan rack ini?"
          body="Waktu tidak akan masuk statistik. Rack baru akan langsung dimulai."
          buttons={[
            { label: 'Lanjut (Jangan Batalkan)', onClick: () => setModal(null), variant: 'default' },
            { label: 'Batalkan Rack', onClick: handleAbandonConfirm, variant: 'danger' },
          ]}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'recovery' && (
        <Modal
          title="Rack sebelumnya di-pause"
          body="Kamu sebelumnya menjeda rack ini. Lanjutkan atau batalkan?"
          buttons={[
            { label: 'Lanjutkan Rack', onClick: handleRecoveryContinue, variant: 'default' },
            { label: 'Batalkan Rack', onClick: handleRecoveryAbandon, variant: 'danger' },
          ]}
        />
      )}
    </div>
  )
}