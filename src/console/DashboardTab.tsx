import { useState, useEffect } from 'react'
import type { AppMetrics } from '../types.ts'
import { getTypeClasses } from '../typeRegistry.ts'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { Icon } from '../components/Icon.tsx'
import { OverflowMenu } from '../components/OverflowMenu.tsx'
import type { MenuAction } from '../components/OverflowMenu.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { statusColors } from '../tokens.ts'
import { useConsoleData } from '../hooks/useConsoleData.ts'

interface DashboardTabProps {
  onNavigateToLogs?: (appId: string) => void
}

export function DashboardTab({ onNavigateToLogs }: DashboardTabProps) {
  const {
    apps, statuses, getStatus, startApp, stopApp, restartApp,
    openInBrowser, removeApp, openTerminal, startAll, stopAll, getAppError,
  } = useConsoleData()
  const [metrics, setMetrics] = useState<Record<string, AppMetrics>>({})
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      const newMetrics: Record<string, AppMetrics> = {}
      for (const app of apps) {
        if (app.type === 'grouped' && app.components) {
          for (const comp of app.components) {
            if (statuses[comp.id]?.status === 'running') {
              const r = await window.electronAPI.getAppMetrics(comp.id)
              if (r.ok && r.data) newMetrics[comp.id] = r.data
            }
          }
        } else if (statuses[app.id]?.status === 'running') {
          const r = await window.electronAPI.getAppMetrics(app.id)
          if (r.ok && r.data) newMetrics[app.id] = r.data
        }
      }
      setMetrics(newMetrics)
    }
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5000)
    return () => clearInterval(interval)
  }, [apps, statuses])

  const counts = {
    total: apps.length,
    running: apps.filter(a => getStatus(a) === 'running').length,
    error: apps.filter(a => getStatus(a) === 'error').length,
    stopped: apps.filter(a => getStatus(a) === 'stopped').length,
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total" value={counts.total} color="text-neutral-500 dark:text-neutral-400" bgColor="bg-neutral-100 dark:bg-neutral-800" />
        <StatCard label="Running" value={counts.running} color={statusColors.running.text} bgColor={statusColors.running.bg} />
        <StatCard label="Errors" value={counts.error} color={statusColors.error.text} bgColor={statusColors.error.bg} />
        <StatCard label="Stopped" value={counts.stopped} color={statusColors.stopped.text} bgColor={statusColors.stopped.bg} />
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <button
          onClick={startAll}
          className="text-xs px-3 py-1.5 rounded-md border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 transition-colors"
        >
          Start All
        </button>
        <button
          onClick={stopAll}
          className="text-xs px-3 py-1.5 rounded-md border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"
        >
          Stop All
        </button>
      </div>

      {/* Per-app overview */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Applications</h2>
        <div className="space-y-2">
          {apps.map(app => {
            const status = getStatus(app)
            const isRunning = status === 'running' || status === 'starting'
            const runtimePort = statuses[app.id]?.port || app.port
            const error = getAppError(app)
            const ids = app.type === 'grouped' && app.components
              ? app.components.map(c => c.id)
              : [app.id]
            const appMetrics = ids.map(id => metrics[id]).filter(Boolean)
            const borderStyle = statusColors[status]?.cardBorder ?? statusColors.stopped.cardBorder

            const menuItems: MenuAction[] = [
              { icon: 'external-link', label: 'Open in Browser', onClick: () => openInBrowser(runtimePort!), visible: isRunning && !!runtimePort },
              { icon: 'terminal', label: 'View Logs', onClick: () => onNavigateToLogs?.(app.type === 'grouped' && app.components?.length ? app.components[0].id : app.id), visible: !!onNavigateToLogs },
              { icon: 'restart', label: 'Restart', onClick: () => restartApp(app.id), visible: isRunning },
              { icon: 'terminal-prompt', label: 'Open Terminal', onClick: () => openTerminal(app.id), visible: !!app.path },
              { icon: 'trash', label: 'Remove', onClick: () => setConfirmTarget({ id: app.id, name: app.name }), danger: true },
            ]

            return (
              <div key={app.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${borderStyle}`}>
                <StatusBadge status={status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{app.name}</span>
                    <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${getTypeClasses(app.type)}`}>
                      {app.type}
                    </span>
                    {app.autoStart && (
                      <span className="text-[8px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        AUTO
                      </span>
                    )}
                  </div>
                  {isRunning && runtimePort && (
                    <span className="text-[11px] text-neutral-500 font-mono">localhost:{runtimePort}</span>
                  )}
                  {error && (
                    <p className="text-[10px] text-red-400 mt-0.5 truncate" title={error}>{error}</p>
                  )}
                </div>
                {appMetrics.length > 0 && (
                  <div className="flex items-center gap-3 text-[11px] text-neutral-500 font-mono">
                    <span title="CPU">CPU {appMetrics[0].cpu}</span>
                    <span title="Memory">{appMetrics[0].rss}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  {isRunning ? (
                    <button onClick={() => stopApp(app.id)} className="btn-action-stop" title="Stop">
                      <Icon name="stop" className="w-3 h-3" />
                    </button>
                  ) : (
                    <button onClick={() => startApp(app.id)} className="btn-action-start" title="Start">
                      <Icon name="play" className="w-3 h-3" />
                    </button>
                  )}
                  <OverflowMenu items={menuItems} width="w-44" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmTarget && (
        <ConfirmDialog
          message={`Remove "${confirmTarget.name}"? This cannot be undone.`}
          onConfirm={() => { removeApp(confirmTarget.id); setConfirmTarget(null) }}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, color, bgColor }: { label: string; value: number; color: string; bgColor: string }) {
  return (
    <div className={`rounded-xl px-4 py-3 ${bgColor}`}>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">{label}</div>
    </div>
  )
}
