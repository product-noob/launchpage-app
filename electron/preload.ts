import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  listApps: () => ipcRenderer.invoke('app:list'),
  startApp: (id: string) => ipcRenderer.invoke('app:start', id),
  stopApp: (id: string) => ipcRenderer.invoke('app:stop', id),
  restartApp: (id: string) => ipcRenderer.invoke('app:restart', id),
  getStatuses: () => ipcRenderer.invoke('app:status'),
  openInBrowser: (port: number) => ipcRenderer.invoke('app:open', port),
  addApp: (app: unknown) => ipcRenderer.invoke('app:add', app),
  updateApp: (id: string, updates: unknown) => ipcRenderer.invoke('app:update', id, updates),
  removeApp: (id: string) => ipcRenderer.invoke('app:remove', id),
  getLogs: (id: string) => ipcRenderer.invoke('app:logs', id),
  clearLogs: (id: string) => ipcRenderer.invoke('app:clearLogs', id),
  startAll: () => ipcRenderer.invoke('app:startAll'),
  stopAll: () => ipcRenderer.invoke('app:stopAll'),
  startComponent: (componentId: string) => ipcRenderer.invoke('app:startComponent', componentId),
  stopComponent: (componentId: string) => ipcRenderer.invoke('app:stopComponent', componentId),
  reorderApps: (orderedIds: string[]) => ipcRenderer.invoke('app:reorder', orderedIds),
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  onStatusUpdate: (callback: (statuses: Record<string, { status: string; error?: string; pid?: number; startedAt?: number }>) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, statuses: Record<string, { status: string; error?: string; pid?: number; startedAt?: number }>) => callback(statuses)
    ipcRenderer.on('status:update', handler)
    return () => ipcRenderer.removeListener('status:update', handler)
  },
  // Phase 3: Value-add features
  openTerminal: (appId: string) => ipcRenderer.invoke('app:openTerminal', appId),
  exportConfig: () => ipcRenderer.invoke('config:export'),
  importConfig: () => ipcRenderer.invoke('config:import'),
  // Phase 4: Console features
  openConsole: () => ipcRenderer.invoke('console:open'),
  readRawConfig: () => ipcRenderer.invoke('config:raw:read'),
  writeRawConfig: (json: string) => ipcRenderer.invoke('config:raw:write', json),
  getAppMetrics: (id: string) => ipcRenderer.invoke('app:metrics', id),
  getScanDefaults: () => ipcRenderer.invoke('scanner:defaults'),
  scanProjects: (directories: string[]) => ipcRenderer.invoke('scanner:scan', directories),
  selectScanFolders: () => ipcRenderer.invoke('scanner:selectFolder'),
  quitApp: () => ipcRenderer.invoke('app:quit'),
  onConfigChanged: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('config:changed', handler)
    return () => ipcRenderer.removeListener('config:changed', handler)
  },
  onLogData: (callback: (data: { id: string; lines: string[] }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { id: string; lines: string[] }) => callback(data)
    ipcRenderer.on('log:data', handler)
    return () => ipcRenderer.removeListener('log:data', handler)
  },
})
