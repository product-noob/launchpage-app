import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { AppEntry, AppStatus, StatusInfo, Toast } from '../types.ts'
import { getAppStatus } from '../utils/status.ts'

let toastId = 0

export interface ConsoleData {
  apps: AppEntry[]
  statuses: Record<string, StatusInfo>
  loading: boolean
  toasts: Toast[]
  getStatus: (app: AppEntry) => AppStatus
  getAppError: (app: AppEntry) => string | undefined
  startApp: (id: string) => void
  stopApp: (id: string) => void
  restartApp: (id: string) => void
  openInBrowser: (port: number) => void
  removeApp: (id: string) => void
  openTerminal: (id: string) => void
  addApp: (app: AppEntry) => Promise<void>
  updateApp: (id: string, updates: Partial<AppEntry>) => Promise<void>
  refreshApps: () => Promise<void>
  startComponent: (id: string) => void
  stopComponent: (id: string) => void
  isOperationPending: (id: string) => boolean
  startAll: () => void
  stopAll: () => void
  addToast: (message: string, type?: Toast['type']) => void
  dismissToast: (id: number) => void
}

export const ConsoleDataContext = createContext<ConsoleData | null>(null)

export function useConsoleData(): ConsoleData {
  const ctx = useContext(ConsoleDataContext)
  if (!ctx) throw new Error('useConsoleData must be used within ConsoleDataProvider')
  return ctx
}

/** Shared data hook used by the ConsoleDataProvider -fetches apps list,
 *  subscribes to status updates, and re-fetches on config changes. */
export function useConsoleDataValue(): ConsoleData {
  const [apps, setApps] = useState<AppEntry[]>([])
  const [statuses, setStatuses] = useState<Record<string, StatusInfo>>({})
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [pendingOps, setPendingOps] = useState<Set<string>>(new Set())
  const statusSnapshotRef = useRef('')

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const setPending = useCallback((id: string, pending: boolean) => {
    setPendingOps(prev => {
      const next = new Set(prev)
      if (pending) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const refreshApps = useCallback(async () => {
    const result = await window.electronAPI.listApps()
    if (result.ok && result.data) {
      setApps(result.data.apps)
    } else if (result.error) {
      addToast(result.error, 'error')
    }
    setLoading(false)
  }, [addToast])

  useEffect(() => { refreshApps() }, [refreshApps])

  useEffect(() => {
    const unsub = window.electronAPI.onStatusUpdate(s => {
      const snapshot = JSON.stringify(s)
      if (snapshot !== statusSnapshotRef.current) {
        statusSnapshotRef.current = snapshot
        setStatuses(s)
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!window.electronAPI.onConfigChanged) return
    const unsub = window.electronAPI.onConfigChanged(() => {
      refreshApps()
    })
    return unsub
  }, [refreshApps])

  const getStatusCb = useCallback(
    (app: AppEntry) => getAppStatus(app, statuses),
    [statuses],
  )

  const getAppError = useCallback((app: AppEntry): string | undefined => {
    if (app.type === 'grouped' && app.components) {
      for (const c of app.components) {
        const err = statuses[c.id]?.error
        if (err) return `${c.name}: ${err}`
      }
      return undefined
    }
    return statuses[app.id]?.error
  }, [statuses])

  const startApp = useCallback(async (id: string) => {
    setPending(id, true)
    const result = await window.electronAPI.startApp(id)
    setPending(id, false)
    if (!result.ok) addToast(result.error || 'Failed to start app', 'error')
    else addToast('App started', 'success')
  }, [addToast, setPending])

  const stopApp = useCallback(async (id: string) => {
    setPending(id, true)
    const result = await window.electronAPI.stopApp(id)
    setPending(id, false)
    if (!result.ok) addToast(result.error || 'Failed to stop app', 'error')
    else addToast('App stopped', 'info')
  }, [addToast, setPending])

  const restartApp = useCallback(async (id: string) => {
    setPending(id, true)
    const result = await window.electronAPI.restartApp(id)
    setPending(id, false)
    if (!result.ok) addToast(result.error || 'Failed to restart app', 'error')
    else addToast('App restarting...', 'info')
  }, [addToast, setPending])

  const openInBrowser = useCallback((port: number) => { window.electronAPI.openInBrowser(port) }, [])
  const openTerminal = useCallback((id: string) => { window.electronAPI.openTerminal(id) }, [])

  const addApp = useCallback(async (app: AppEntry) => {
    const result = await window.electronAPI.addApp(app)
    if (!result.ok) addToast(result.error || 'Failed to add app', 'error')
    else { addToast(`${app.name} added`, 'success'); await refreshApps() }
  }, [addToast, refreshApps])

  const updateApp = useCallback(async (id: string, updates: Partial<AppEntry>) => {
    const result = await window.electronAPI.updateApp(id, updates)
    if (!result.ok) addToast(result.error || 'Failed to update app', 'error')
    else { addToast('App updated', 'success'); await refreshApps() }
  }, [addToast, refreshApps])

  const removeApp = useCallback(async (id: string) => {
    const app = apps.find(a => a.id === id)
    const appName = app?.name || id
    const result = await window.electronAPI.removeApp(id)
    if (!result.ok) addToast(result.error || 'Failed to remove app', 'error')
    else { addToast(`"${appName}" removed`, 'info'); await refreshApps() }
  }, [apps, addToast, refreshApps])

  const startAll = useCallback(async () => {
    const result = await window.electronAPI.startAll()
    if (!result.ok) addToast(result.error || 'Failed to start all apps', 'error')
    else addToast('Starting all apps...', 'success')
  }, [addToast])

  const stopAll = useCallback(async () => {
    const result = await window.electronAPI.stopAll()
    if (!result.ok) addToast(result.error || 'Failed to stop all apps', 'error')
    else addToast('All apps stopped', 'info')
  }, [addToast])

  const startComponent = useCallback(async (componentId: string) => {
    setPending(componentId, true)
    const result = await window.electronAPI.startComponent(componentId)
    setPending(componentId, false)
    if (!result.ok) addToast(result.error || 'Failed to start component', 'error')
  }, [addToast, setPending])

  const stopComponent = useCallback(async (componentId: string) => {
    setPending(componentId, true)
    const result = await window.electronAPI.stopComponent(componentId)
    setPending(componentId, false)
    if (!result.ok) addToast(result.error || 'Failed to stop component', 'error')
  }, [addToast, setPending])

  const isOperationPending = useCallback((id: string): boolean => {
    return pendingOps.has(id)
  }, [pendingOps])

  return {
    apps, statuses, loading, toasts,
    getStatus: getStatusCb, getAppError,
    startApp, stopApp, restartApp, openInBrowser, openTerminal,
    addApp, updateApp, removeApp, refreshApps,
    startAll, stopAll, startComponent, stopComponent,
    isOperationPending, addToast, dismissToast,
  }
}
