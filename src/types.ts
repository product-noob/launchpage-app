// Re-export shared types used by both main and renderer
export type { AppType, AppStatus, AppComponent, AppEntry, AppsData, StatusInfo, IpcResult, AppMetrics, DiscoveredProject, Toast } from '../shared/types.ts'
import type { AppEntry, StatusInfo, IpcResult, AppsData, AppMetrics, DiscoveredProject } from '../shared/types.ts'

export interface ElectronAPI {
  platform: string
  listApps: () => Promise<IpcResult<AppsData>>
  startApp: (id: string) => Promise<IpcResult>
  stopApp: (id: string) => Promise<IpcResult>
  restartApp: (id: string) => Promise<IpcResult>
  getStatuses: () => Promise<Record<string, StatusInfo>>
  openInBrowser: (port: number) => Promise<IpcResult>
  addApp: (app: AppEntry) => Promise<IpcResult>
  updateApp: (id: string, updates: Partial<AppEntry>) => Promise<IpcResult>
  removeApp: (id: string) => Promise<IpcResult>
  getLogs: (id: string) => Promise<string[]>
  clearLogs: (id: string) => Promise<IpcResult>
  startAll: () => Promise<IpcResult>
  stopAll: () => Promise<IpcResult>
  startComponent: (componentId: string) => Promise<IpcResult>
  stopComponent: (componentId: string) => Promise<IpcResult>
  reorderApps: (orderedIds: string[]) => Promise<IpcResult>
  selectFolder: () => Promise<string | null>
  onStatusUpdate: (callback: (statuses: Record<string, StatusInfo>) => void) => () => void
  openTerminal: (appId: string) => Promise<IpcResult>
  exportConfig: () => Promise<IpcResult>
  importConfig: () => Promise<IpcResult>
  openConsole: () => Promise<IpcResult>
  readRawConfig: () => Promise<IpcResult<string>>
  writeRawConfig: (json: string) => Promise<IpcResult>
  getAppMetrics: (id: string) => Promise<IpcResult<AppMetrics>>
  getScanDefaults: () => Promise<IpcResult<string[]>>
  scanProjects: (directories: string[]) => Promise<IpcResult<DiscoveredProject[]>>
  selectScanFolders: () => Promise<IpcResult<string[]>>
  quitApp: () => Promise<void>
  onConfigChanged: (callback: () => void) => () => void
  onLogData: (callback: (data: { id: string; lines: string[] }) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
