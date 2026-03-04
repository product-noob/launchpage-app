import { ipcMain } from 'electron'
import { startApp, stopApp, getLogs, clearLogs, getAllStatuses } from './process-manager.ts'
import { readApps, writeApps } from './config-store.ts'
import { ipcResult, ipcError, broadcastConfigChanged, startAppEntry, stopAppEntry } from './ipc-handlers.ts'
import type { AppEntry } from '../shared/types.ts'

export function setupAppHandlers() {
  ipcMain.handle('app:list', () => {
    try {
      return ipcResult(readApps())
    } catch (err) {
      return ipcError(`Failed to load apps: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('app:start', (_event, id: string) => {
    try {
      const appEntry = readApps().apps.find(a => a.id === id)
      if (!appEntry) return ipcError('App not found')
      startAppEntry(appEntry)
      return ipcResult()
    } catch (err) {
      return ipcError(`Failed to start app: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('app:stop', async (_event, id: string) => {
    try {
      const appEntry = readApps().apps.find(a => a.id === id)
      if (!appEntry) return ipcError('App not found')
      await stopAppEntry(appEntry)
      return ipcResult()
    } catch (err) {
      return ipcError(`Failed to stop app: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('app:restart', async (_event, id: string) => {
    try {
      const appEntry = readApps().apps.find(a => a.id === id)
      if (!appEntry) return ipcError('App not found')
      await stopAppEntry(appEntry)
      await new Promise(resolve => setTimeout(resolve, 500))
      startAppEntry(appEntry)
      return ipcResult()
    } catch (err) {
      return ipcError(`Failed to restart app: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('app:status', () => {
    try {
      return getAllStatuses()
    } catch (err) {
      return ipcError(`Failed to get statuses: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('app:add', (_event, newApp: AppEntry) => {
    try {
      const data = readApps()
      if (data.apps.some(a => a.id === newApp.id)) {
        return ipcError(`App with id "${newApp.id}" already exists`)
      }
      data.apps.push(newApp)
      writeApps(data)
      broadcastConfigChanged()
      return ipcResult()
    } catch (err) {
      return ipcError(`Failed to add app: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('app:update', (_event, id: string, updates: Partial<AppEntry>) => {
    try {
      const data = readApps()
      const idx = data.apps.findIndex(a => a.id === id)
      if (idx === -1) return ipcError('App not found')
      data.apps[idx] = { ...data.apps[idx], ...updates }
      writeApps(data)
      broadcastConfigChanged()
      return ipcResult()
    } catch (err) {
      return ipcError(`Failed to update app: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('app:remove', async (_event, id: string) => {
    try {
      const data = readApps()
      const appEntry = data.apps.find(a => a.id === id)
      if (appEntry) {
        await stopAppEntry(appEntry)
      }
      data.apps = data.apps.filter(a => a.id !== id)
      writeApps(data)
      broadcastConfigChanged()
      return ipcResult()
    } catch (err) {
      return ipcError(`Failed to remove app: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('app:logs', (_event, id: string) => {
    try {
      return getLogs(id)
    } catch (err) {
      return ipcError(`Failed to get logs: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('app:clearLogs', (_event, id: string) => {
    clearLogs(id)
    return ipcResult()
  })

  ipcMain.handle('app:startAll', () => {
    try {
      const { apps } = readApps()
      for (const appEntry of apps) {
        startAppEntry(appEntry)
      }
      return ipcResult()
    } catch (err) {
      return ipcError(`Failed to start all: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('app:stopAll', async () => {
    try {
      const { apps } = readApps()
      for (const appEntry of apps) {
        await stopAppEntry(appEntry)
      }
      return ipcResult()
    } catch (err) {
      return ipcError(`Failed to stop all: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('app:startComponent', (_event, componentId: string) => {
    try {
      const { apps } = readApps()
      for (const appEntry of apps) {
        if (appEntry.type === 'grouped' && appEntry.components) {
          const comp = appEntry.components.find(c => c.id === componentId)
          if (comp) {
            startApp(comp.id, comp.path, comp.command, comp.port, comp.type)
            return ipcResult()
          }
        }
      }
      return ipcError('Component not found')
    } catch (err) {
      return ipcError(`Failed to start component: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('app:stopComponent', async (_event, componentId: string) => {
    try {
      await stopApp(componentId)
      return ipcResult()
    } catch (err) {
      return ipcError(`Failed to stop component: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('app:reorder', (_event, orderedIds: string[]) => {
    try {
      const data = readApps()
      const appMap = new Map(data.apps.map(a => [a.id, a]))
      const reordered = orderedIds.map(id => appMap.get(id)).filter((a): a is AppEntry => !!a)
      for (const a of data.apps) {
        if (!orderedIds.includes(a.id)) reordered.push(a)
      }
      data.apps = reordered
      writeApps(data)
      broadcastConfigChanged()
      return ipcResult()
    } catch (err) {
      return ipcError(`Failed to reorder: ${err instanceof Error ? err.message : String(err)}`)
    }
  })
}
