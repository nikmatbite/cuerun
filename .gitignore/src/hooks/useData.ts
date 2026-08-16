import { useState, useEffect, useCallback } from 'react'
import { Session, Rack } from '@/types'
import { getAllSessions } from '@/database/db'
import { getAllRacks } from '@/services/sessionService'

export function useData() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [racks, setRacks] = useState<Rack[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const [s, r] = await Promise.all([getAllSessions(), getAllRacks()])
    setSessions(s)
    setRacks(r)
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { sessions, racks, loading, reload }
}
