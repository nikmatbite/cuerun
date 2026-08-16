import { useState, useCallback } from 'react'
import { AppPage, GameMode, Drill, Variant } from '@/types'

export interface AppState {
  page: AppPage
  // Setup selection
  selectedMode: GameMode | null
  selectedDrill: Drill | null
  selectedVariant: Variant | null
  // Active session
  activeSessionId: string | null
  activeRackId: string | null
}

const INITIAL_STATE: AppState = {
  page: 'home',
  selectedMode: null,
  selectedDrill: null,
  selectedVariant: null,
  activeSessionId: null,
  activeRackId: null,
}

export function useAppState() {
  const [state, setState] = useState<AppState>(INITIAL_STATE)

  const navigate = useCallback((page: AppPage) => {
    setState((s) => ({ ...s, page }))
  }, [])

  const selectMode = useCallback((mode: GameMode) => {
    setState((s) => ({ ...s, selectedMode: mode, selectedDrill: null, selectedVariant: null }))
  }, [])

  const selectDrill = useCallback((drill: Drill) => {
    setState((s) => ({ ...s, selectedDrill: drill, selectedVariant: null }))
  }, [])

  const selectVariant = useCallback((variant: Variant) => {
    setState((s) => ({ ...s, selectedVariant: variant }))
  }, [])

  const startTimerSession = useCallback((sessionId: string, rackId: string) => {
    setState((s) => ({ ...s, page: 'timer', activeSessionId: sessionId, activeRackId: rackId }))
  }, [])

  const setActiveRack = useCallback((rackId: string | null) => {
    setState((s) => ({ ...s, activeRackId: rackId }))
  }, [])

  const resetToHome = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  return {
    state,
    navigate,
    selectMode,
    selectDrill,
    selectVariant,
    startTimerSession,
    setActiveRack,
    resetToHome,
  }
}
