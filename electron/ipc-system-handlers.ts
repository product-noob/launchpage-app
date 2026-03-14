import { ipcMain, shell, dialog, type BrowserWindow } from 'electron'
import fs from 'node:fs'
import { getAllStatuses } from './process-manager.ts'
import { openTerminal, getProcessMetrics } from './platform.ts'
import { getAppsJsonPath, validateAppEntry, readApps, writeApps } from './config-store.ts'
import { scanDirectories, getDefaultScanDirectories } from './project-scanner.ts'
import { ipcResult, ipcError, broadcastConfigChanged } from './ipc-handlers.ts'
import { getMainWindow, setDialogOpen } from './main.ts'

/** Open a native dialog without the tray window hiding on blur */
async function showDialogWithoutHiding<T>(
  fn: (parent: BrowserWindow | undefined) => Promise<T>,
): Promise<T> {
  const win = getMainWindow() ?? undefined
  setDialogOpen(true)
  try {
    const result = await fn(win)
    return result
  } finally {
    setDialogOpen(false)
    if (win && !win.isDestroyed()) {
      win.show()
      win.focus()
    }
  }
}

export function setupSystemHandlers() {
  ipcMain.handle('app:open', (_event, port: number) => {
    try {
      shell.openExternal(`http://localhost:${port}`)
      return ipcResult()
    } catch (err) {
      return ipcError(`Failed to open browser: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('dialog:selectFolder', async () => {
    return showDialogWithoutHiding(async (parent) => {
      const opts = { properties: ['openDirectory' as const] }
      const result = parent
        ? await dialog.showOpenDialog(parent, opts)
        : await dialog.showOpenDialog(opts)
      if (result.canceled) return null
      return result.filePaths[0]
    })
  })

  ipcMain.handle('app:openTerminal', (_event, appId: string) => {
    try {
      const { apps } = readApps()
      let appPath: string | undefined

      const appEntry = apps.find(a => a.id === appId)
      if (appEntry) {
        appPath = appEntry.path
        if (!appPath && appEntry.components?.length) {
          appPath = appEntry.components[0].path
        }
      }

      if (!appPath) {
        for (const a of apps) {
          if (a.components) {
            const comp = a.components.find(c => c.id === appId)
            if (comp) { appPath = comp.path; break }
          }
        }
      }

      if (!appPath) return ipcError('App path not found')
      openTerminal(appPath)
      return ipcResult()
    } catch (err) {
      return ipcError(`Failed to open terminal: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('config:export', async () => {
    try {
      const appsPath = getAppsJsonPath()
      const result = await showDialogWithoutHiding(async (parent) => {
        const opts = {
          defaultPath: 'launchpad-config.json',
          filters: [{ name: 'JSON', extensions: ['json'] }],
        }
        return parent
          ? dialog.showSaveDialog(parent, opts)
          : dialog.showSaveDialog(opts)
      })
      if (result.canceled || !result.filePath) return ipcResult()
      fs.copyFileSync(appsPath, result.filePath)
      return ipcResult()
    } catch (err) {
      return ipcError(`Failed to export: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('config:import', async () => {
    try {
      const result = await showDialogWithoutHiding(async (parent) => {
        const opts = {
          filters: [{ name: 'JSON', extensions: ['json'] }],
          properties: ['openFile' as const],
        }
        return parent
          ? dialog.showOpenDialog(parent, opts)
          : dialog.showOpenDialog(opts)
      })
      if (result.canceled || !result.filePaths[0]) return ipcResult()
      const content = fs.readFileSync(result.filePaths[0], 'utf-8')
      const parsed = JSON.parse(content)
      if (!parsed || !Array.isArray(parsed.apps)) {
        return ipcError('Invalid config file: must contain an "apps" array')
      }
      const valid = parsed.apps.filter((entry: unknown) => validateAppEntry(entry))
      writeApps({ apps: valid })
      broadcastConfigChanged()
      return ipcResult()
    } catch (err) {
      return ipcError(`Failed to import: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  // Note: 'console:open' and 'app:quit' are registered in main.ts
  // because they depend on main-process state (window refs, app lifecycle).

  ipcMain.handle('config:raw:read', () => {
    try {
      const appsPath = getAppsJsonPath()
      const content = fs.existsSync(appsPath) ? fs.readFileSync(appsPath, 'utf-8') : '{"apps": []}'
      return ipcResult(content)
    } catch (err) {
      return ipcError(`Failed to read config: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('config:raw:write', (_event, json: string) => {
    try {
      const parsed = JSON.parse(json)
      if (!parsed || !Array.isArray(parsed.apps)) {
        return ipcError('Invalid JSON: must contain an "apps" array')
      }
      const valid = parsed.apps.filter((entry: unknown) => validateAppEntry(entry))
      const skipped = parsed.apps.length - valid.length
      writeApps({ apps: valid })
      broadcastConfigChanged()
      if (skipped > 0) {
        return ipcResult({ warning: `${skipped} invalid ${skipped === 1 ? 'entry was' : 'entries were'} removed` })
      }
      return ipcResult()
    } catch (err) {
      return ipcError(`Failed to write config: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('scanner:defaults', () => {
    try {
      return ipcResult(getDefaultScanDirectories())
    } catch (err) {
      return ipcError(`Failed to get scan directories: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('scanner:scan', async (_event, directories: string[]) => {
    try {
      const { apps } = readApps()
      const existingPaths = new Set<string>()
      for (const app of apps) {
        if (app.path) existingPaths.add(app.path)
        if (app.components) {
          for (const c of app.components) existingPaths.add(c.path)
        }
      }
      const results = await scanDirectories(directories, existingPaths)
      return ipcResult(results)
    } catch (err) {
      return ipcError(`Scan failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  ipcMain.handle('scanner:selectFolder', async () => {
    return showDialogWithoutHiding(async (parent) => {
      const opts = {
        properties: ['openDirectory' as const, 'multiSelections' as const],
        title: 'Select folders to scan for projects',
      }
      const result = parent
        ? await dialog.showOpenDialog(parent, opts)
        : await dialog.showOpenDialog(opts)
      if (result.canceled) return ipcResult([])
      return ipcResult(result.filePaths)
    })
  })

  ipcMain.handle('app:metrics', async (_event, id: string) => {
    const statuses = getAllStatuses()
    const info = statuses[id]
    if (!info || info.status !== 'running' || !info.pid) {
      return ipcResult({ cpu: '-', mem: '-', rss: '-' })
    }
    const metrics = await getProcessMetrics(info.pid)
    return ipcResult(metrics)
  })
}
