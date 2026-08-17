import React, { useState, useEffect } from 'react'
import { GameMode, Drill, Variant } from '@/types'
import { useAppState } from '@/hooks/useAppState'
import { getAllRacks } from '@/services/sessionService'
import { endSession } from '@/services/sessionService'
import BottomNav from '@/components/BottomNav'
import HomePage from '@/pages/HomePage'
import TimerPage from '@/pages/TimerPage'
import StatsPage from '@/pages/StatsPage'
import HistoryPage from '@/pages/HistoryPage'
import SettingsPage from '@/pages/SettingsPage'

export default function App() {
  const { state, navigate, startTimerSession, resetToHome } = useAppState()

  const [activeSession, setActiveSession] = useState<{
    sessionId: string
    rackId: string
    mode: GameMode
    drill: Drill
    variant: Variant
  } | null>(null)

  const [hasCompletedRack, setHasCompletedRack] = useState(false)

  // Check apakah sesi aktif sudah punya rack completed
  useEffect(() => {
    if (!activeSession) {
      setHasCompletedRack(false)
      return
    }
    getAllRacks().then((racks) => {
      const has = racks.some(
        (r) => r.sessionId === activeSession.sessionId && r.status === 'completed'
      )
      setHasCompletedRack(has)
    })
  }, [activeSession])

  const handleSessionStarted = (
    sessionId: string,
    rackId: string,
    mode: GameMode,
    drill: Drill,
    variant: Variant
  ) => {
    setActiveSession({ sessionId, rackId, mode, drill, variant })
    startTimerSession(sessionId, rackId)
  }

  const handleRackStarted = (
    rackId: string,
    mode: GameMode,
    drill: Drill,
    variant: Variant
  ) => {
    if (!activeSession) return
    setActiveSession((prev) => prev ? { ...prev, rackId, mode, drill, variant } : null)
    startTimerSession(activeSession.sessionId, rackId)
  }

  const handleEndSession = async () => {
    if (activeSession) {
      await endSession(activeSession.sessionId)
    }
    setActiveSession(null)
    setHasCompletedRack(false)
    resetToHome()
  }

  const handleChangeMode = () => {
    // Kembali ke home (pilih mode), sesi tetap aktif
    navigate('home')
  }

  // Saat rack selesai (completed), update hasCompletedRack
  const handleRackCompleted = () => {
    setHasCompletedRack(true)
  }

  const currentPage = state.page

  return (
    <div className="flex flex-col min-h-screen bg-surface text-text-primary">
      <main className="flex flex-col flex-1 pb-[68px]" style={{ minHeight: 'calc(100dvh - 68px)' }}>
        {/* Home — hanya render kalau tidak ada sesi aktif di timer */}
        {currentPage === 'home' && (
          <HomePage
            onSessionStarted={handleSessionStarted}
            onRackStarted={handleRackStarted}
            onEndSession={handleEndSession}
            existingSessionId={activeSession?.sessionId ?? null}
            hasCompletedRack={hasCompletedRack}
          />
        )}

        {/* TimerPage — tetap di-mount selama ada sesi aktif, disembunyikan saat tab lain */}
        {activeSession && (
          <div className={currentPage === 'timer' ? 'flex flex-col flex-1' : 'hidden'}>
            <TimerPage
              sessionId={activeSession.sessionId}
              initialRackId={activeSession.rackId}
              mode={activeSession.mode}
              drill={activeSession.drill}
              variant={activeSession.variant}
              onEndSession={handleEndSession}
              onChangeMode={handleChangeMode}
              onRackCompleted={handleRackCompleted}
            />
          </div>
        )}

        {currentPage === 'stats' && <StatsPage />}
        {currentPage === 'history' && <HistoryPage />}
        {currentPage === 'settings' && <SettingsPage />}
      </main>

      <BottomNav
        current={currentPage}
        onNavigate={(page) => navigate(page)}
        hasActiveSession={activeSession !== null}
      />
    </div>
  )
}