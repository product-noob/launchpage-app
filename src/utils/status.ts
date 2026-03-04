import type { AppEntry, AppStatus, StatusInfo } from '../types.ts'

/** Derive aggregate status for an app (handles grouped app component aggregation) */
export function getAppStatus(app: AppEntry, statuses: Record<string, StatusInfo>): AppStatus {
  if (app.type === 'grouped' && app.components) {
    const compStatuses = app.components.map(c => statuses[c.id]?.status || 'stopped')
    if (compStatuses.every(s => s === 'running')) return 'running'
    if (compStatuses.some(s => s === 'error')) return 'error'
    if (compStatuses.some(s => s === 'starting' || s === 'running')) return 'starting'
    return 'stopped'
  }
  return statuses[app.id]?.status || 'stopped'
}
