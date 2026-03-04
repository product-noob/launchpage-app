import { useState, useEffect, useCallback, useRef } from 'react'
import type { AppEntry, StatusInfo, Toast } from '../types.ts'
import type { AppStatus } from '../types.ts'
import { getAppStatus as getAppStatusUtil } from '../utils/status.ts'

export type { Toast }

let toastId = 0

export function useApps() {
  const [apps, setApps] = useState<AppEntry[]>([])
  const [statuses, setStatuses] = useState<Record<string, StatusInfo>>({})
  const statusSnapshotRef = useRef('')
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [pendingOps, setPendingOps] = useState<Set<string>>(new Set())
  const windowVisible = useRef(true)

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

  // F3: Pause status updates when window is hidden
  useEffect(() => {
    const onFocus = () => { windowVisible.current = true }
    const onBlur = () => { windowVisible.current = false }
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = window.electronAPI.onStatusUpdate((s) => {
      if (!windowVisible.current) return
      const snapshot = JSON.stringify(s)
      if (snapshot !== statusSnapshotRef.current) {
        statusSnapshotRef.current = snapshot
        setStatuses(s)
      }
    })
    return unsubscribe
  }, [])

  // Listen for config changes from other windows (e.g. console editor)
  useEffect(() => {
    if (!window.electronAPI.onConfigChanged) return
    const unsubscribe = window.electronAPI.onConfigChanged(() => {
      refreshApps()
    })
    return unsubscribe
  }, [refreshApps])

  const startApp = useCallback(async (id: string) => {
    setPending(id, true)
    const result = await window.electronAPI.startApp(id)
    setPending(id, false)
    if (!result.ok) {
      addToast(result.error || 'Failed to start app', 'error')
    } else {
      addToast('App started', 'success')
    }
    // F1: No manual getStatuses() -the broadcast handles it
  }, [addToast, setPending])

  const stopApp = useCallback(async (id: string) => {
    setPending(id, true)
    const result = await window.electronAPI.stopApp(id)
    setPending(id, false)
    if (!result.ok) {
      addToast(result.error || 'Failed to stop app', 'error')
    } else {
      addToast('App stopped', 'info')
    }
  }, [addToast, setPending])

  const restartApp = useCallback(async (id: string) => {
    setPending(id, true)
    const result = await window.electronAPI.restartApp(id)
    setPending(id, false)
    if (!result.ok) {
      addToast(result.error || 'Failed to restart app', 'error')
    } else {
      addToast('App restarting...', 'info')
    }
  }, [addToast, setPending])

  const openInBrowser = useCallback(async (port: number) => {
    await window.electronAPI.openInBrowser(port)
  }, [])

  const addApp = useCallback(async (app: AppEntry) => {
    const result = await window.electronAPI.addApp(app)
    if (!result.ok) {
      addToast(result.error || 'Failed to add app', 'error')
    } else {
      addToast(`${app.name} added`, 'success')
      await refreshApps()
    }
  }, [refreshApps, addToast])

  const updateApp = useCallback(async (id: string, updates: Partial<AppEntry>) => {
    const result = await window.electronAPI.updateApp(id, updates)
    if (!result.ok) {
      addToast(result.error || 'Failed to update app', 'error')
    } else {
      addToast('App updated', 'success')
      await refreshApps()
    }
  }, [refreshApps, addToast])

  const pendingRemoves = useRef<Map<number, { timerId: ReturnType<typeof setTimeout>; appId: string }>>(new Map())

  const removeApp = useCallback(async (id: string) => {
    const app = apps.find(a => a.id === id)
    const appName = app?.name || id

    setApps(prev => prev.filter(a => a.id !== id))

    const UNDO_DELAY_MS = 5000
    const undoToastId = ++toastId
    let cancelled = false

    const timerId = setTimeout(async () => {
      pendingRemoves.current.delete(undoToastId)
      if (cancelled) return
      const result = await window.electronAPI.removeApp(id)
      if (!result.ok) {
        addToast(result.error || 'Failed to remove app', 'error')
        await refreshApps()
      }
    }, UNDO_DELAY_MS)

    pendingRemoves.current.set(undoToastId, { timerId, appId: id })

    const undoAction = () => {
      cancelled = true
      clearTimeout(timerId)
      pendingRemoves.current.delete(undoToastId)
      setToasts(prev => prev.filter(t => t.id !== undoToastId))
      refreshApps()
    }

    setToasts(prev => [...prev, {
      id: undoToastId,
      message: `"${appName}" removed`,
      type: 'info',
      action: { label: 'Undo', onClick: undoAction },
    }])

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== undoToastId))
    }, UNDO_DELAY_MS)
  }, [apps, addToast, refreshApps])

  const startAll = useCallback(async () => {
    const result = await window.electronAPI.startAll()
    if (!result.ok) {
      addToast(result.error || 'Failed to start all apps', 'error')
    } else {
      addToast('Starting all apps...', 'success')
    }
  }, [addToast])

  const stopAll = useCallback(async () => {
    const result = await window.electronAPI.stopAll()
    if (!result.ok) {
      addToast(result.error || 'Failed to stop all apps', 'error')
    } else {
      addToast('All apps stopped', 'info')
    }
  }, [addToast])

  const startComponent = useCallback(async (componentId: string) => {
    setPending(componentId, true)
    const result = await window.electronAPI.startComponent(componentId)
    setPending(componentId, false)
    if (!result.ok) {
      addToast(result.error || 'Failed to start component', 'error')
    }
  }, [addToast, setPending])

  const stopComponent = useCallback(async (componentId: string) => {
    setPending(componentId, true)
    const result = await window.electronAPI.stopComponent(componentId)
    setPending(componentId, false)
    if (!result.ok) {
      addToast(result.error || 'Failed to stop component', 'error')
    }
  }, [addToast, setPending])

  const getAppStatus = useCallback((app: AppEntry): AppStatus => {
    return getAppStatusUtil(app, statuses)
  }, [statuses])

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

  const isOperationPending = useCallback((id: string): boolean => {
    return pendingOps.has(id)
  }, [pendingOps])

  return {
    apps, statuses, loading, toasts,
    startApp, stopApp, restartApp, openInBrowser,
    addApp, updateApp, removeApp, getAppStatus, getAppError, refreshApps,
    startAll, stopAll, startComponent, stopComponent,
    isOperationPending, addToast, dismissToast,
  }
}
