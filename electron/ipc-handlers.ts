import { BrowserWindow } from 'electron'
import { startApp, stopApp } from './process-manager.ts'
import type { AppEntry } from '../shared/types.ts'
import { setupAppHandlers } from './ipc-app-handlers.ts'
import { setupSystemHandlers } from './ipc-system-handlers.ts'

// Shared IPC response helpers -exported for sub-modules
export function ipcResult(data?: unknown) {
  return { ok: true, data }
}

export function ipcError(error: string) {
  return { ok: false, error }
}

// Shared helpers for grouped app start/stop
export function startAppEntry(appEntry: AppEntry) {
  if (appEntry.type === 'grouped' && appEntry.components) {
    for (const comp of appEntry.components) {
      startApp(comp.id, comp.path, comp.command, comp.port, comp.type)
    }
  } else if (appEntry.path && appEntry.command) {
    startApp(appEntry.id, appEntry.path, appEntry.command, appEntry.port, appEntry.type)
  }
}

export async function stopAppEntry(appEntry: AppEntry) {
  if (appEntry.type === 'grouped' && appEntry.components) {
    await Promise.all(appEntry.components.map(comp => stopApp(comp.id)))
  } else {
    await stopApp(appEntry.id)
  }
}

/** Broadcast config:changed to all windows so they can auto-refresh */
export function broadcastConfigChanged() {
  for (const bw of BrowserWindow.getAllWindows()) {
    if (!bw.isDestroyed()) {
      bw.webContents.send('config:changed')
    }
  }
}

/** Register all IPC handlers */
export function setupIPC() {
  setupAppHandlers()
  setupSystemHandlers()
}
