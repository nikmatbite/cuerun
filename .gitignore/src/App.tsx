import React, { useState } from 'react'
import { GameMode, Drill, Variant } from '@/types'
import { useAppState } from '@/hooks/useAppState'
import BottomNav from '@/components/BottomNav'
import HomePage from '@/pages/HomePage'
import TimerPage from '@/pages/TimerPage'
import StatsPage from '@/pages/StatsPage'
import HistoryPage from '@/pages/HistoryPage'
import SettingsPage from '@/pages/SettingsPage'

export default function App() {
  const { state, navigate, startTimerSession, resetToHome } = useAppState()

  // Track active session/rack/mode across the app
  const [activeSession, setActiveSession] = useState<{
    sessionId: string
    rackId: string
    mode: GameMode
    drill: Drill
    variant: Variant
  } | null>(null)

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

  const handleEndSession = () => {
    setActiveSession(null)
    resetToHome()
  }

  const handleChangeMode = () => {
    // Stay in home page, preserving session so next rack joins same session
    navigate('home')
  }

  const currentPage = state.page

  return (
    <div className="flex flex-col min-h-screen bg-surface text-text-primary">
      {/* Page content */}
      <main className="flex flex-col flex-1 pb-[68px]" style={{ minHeight: 'calc(100dvh - 68px)' }}>
        {currentPage === 'home' && (
          <HomePage
            onSessionStarted={handleSessionStarted}
            existingSessionId={activeSession?.sessionId ?? null}
          />
        )}

        {currentPage === 'timer' && activeSession && (
          <TimerPage
            sessionId={activeSession.sessionId}
            initialRackId={activeSession.rackId}
            mode={activeSession.mode}
            drill={activeSession.drill}
            variant={activeSession.variant}
            onEndSession={handleEndSession}
            onChangeMode={handleChangeMode}
          />
        )}

        {currentPage === 'stats' && <StatsPage />}
        {currentPage === 'history' && <HistoryPage />}
        {currentPage === 'settings' && <SettingsPage />}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        current={currentPage}
        onNavigate={(page) => {
          if (page === 'home') {
            // If we have active session, go back to timer
            if (activeSession && currentPage === 'timer') return
            navigate('home')
          } else {
            navigate(page)
          }
        }}
      />
    </div>
  )
}
