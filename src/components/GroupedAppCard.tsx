import { useState } from 'react'
import type { AppEntry, AppStatus, StatusInfo } from '../types.ts'
import { StatusBadge } from './StatusBadge.tsx'
import { Icon } from './Icon.tsx'
import { OverflowMenu } from './OverflowMenu.tsx'
import type { MenuAction } from './OverflowMenu.tsx'
import { getTypeClasses } from '../typeRegistry.ts'
import { statusColors } from '../tokens.ts'

interface GroupedAppCardProps {
  app: AppEntry
  status: AppStatus
  componentStatuses: Record<string, StatusInfo>
  pending?: boolean
  focused?: boolean
  onStart: () => void
  onStop: () => void
  onRestart: () => void
  onOpen: (port: number) => void
  onRemove: () => void
  onEdit: () => void
  onViewLogs: (id: string) => void
  onStartComponent: (id: string) => void
  onStopComponent: (id: string) => void
  isComponentPending: (id: string) => boolean
}

export function GroupedAppCard({
  app, status, componentStatuses, pending, focused, onStart, onStop, onRestart, onOpen, onRemove, onEdit, onViewLogs,
  onStartComponent, onStopComponent, isComponentPending,
}: GroupedAppCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isRunning = status === 'running'
  const isBusy = status === 'starting' || !!pending
  const components = app.components || []

  const menuItems: MenuAction[] = [
    { icon: 'restart', label: 'Restart All', onClick: onRestart, visible: isRunning || status === 'starting' },
    { icon: 'edit', label: 'Edit', onClick: onEdit },
    { icon: 'trash', label: 'Remove', onClick: onRemove, danger: true },
  ]

  return (
    <div data-app-card className={`rounded-lg border transition-all ${statusColors[status].cardBorder} ${focused ? 'ring-1 ring-sky-500/50' : ''}`}>
      <div className="group px-3 py-2 flex items-center gap-2.5 cursor-default">
        <StatusBadge status={status} />
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 min-w-0 text-left"
          aria-label={expanded ? 'Collapse services' : 'Expand services'}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100 truncate">{app.name}</span>
            <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${getTypeClasses('grouped')}`}>
              {components.length} services
            </span>
            <Icon
              name="chevron-right"
              className={`w-3 h-3 text-neutral-400 dark:text-neutral-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          </div>
        </button>
        <div className="flex items-center gap-1">
          {isRunning || status === 'starting' ? (
            <button onClick={onStop} disabled={isBusy} className="btn-action-stop disabled:opacity-50" title="Stop all" aria-label="Stop all services">
              <Icon name="stop" className="w-3 h-3" />
            </button>
          ) : (
            <button onClick={onStart} disabled={isBusy} className="btn-action-start disabled:opacity-50" title="Start all" aria-label="Start all services">
              <Icon name="play" className="w-3 h-3" />
            </button>
          )}
          <OverflowMenu items={menuItems} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-neutral-200 dark:border-neutral-800 px-3 py-1.5 space-y-1">
          {components.map((comp) => {
            const compStatus = componentStatuses[comp.id]?.status || 'stopped'
            const compRunning = compStatus === 'running'
            const compStarting = compStatus === 'starting'
            const compError = componentStatuses[comp.id]?.error
            const compPending = isComponentPending(comp.id)
            const compBusy = compStarting || compPending
            const typeStyle = getTypeClasses(comp.type)
            const compActivePort = componentStatuses[comp.id]?.port ?? comp.port
            return (
              <div key={comp.id} className="flex items-center gap-2 py-0.5 pl-2">
                <StatusBadge status={compStatus} />
                <span className="text-xs text-neutral-700 dark:text-neutral-300 flex-1 truncate">{comp.name}</span>
                <span className={`text-[8px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded ${typeStyle}`}>
                  {comp.type}
                </span>
                {compRunning && compActivePort && (
                  <button
                    onClick={() => onOpen(compActivePort)}
                    className="text-[10px] text-sky-400 hover:text-sky-300 font-mono"
                    aria-label={`Open port ${compActivePort}`}
                  >
                    :{compActivePort}
                  </button>
                )}
                {compError && (
                  <span className="text-[9px] text-red-400 truncate max-w-[100px]" title={compError}>{compError}</span>
                )}
                <button
                  onClick={() => onViewLogs(comp.id)}
                  className="btn-icon text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                  title={`Logs: ${comp.name}`}
                  aria-label={`View logs for ${comp.name}`}
                >
                  <Icon name="terminal" className="w-3 h-3" />
                </button>
                {compRunning || compStarting ? (
                  <button
                    onClick={() => onStopComponent(comp.id)}
                    disabled={compBusy}
                    className="btn-icon text-red-400 hover:bg-red-400/10 disabled:opacity-50"
                    title={`Stop ${comp.name}`}
                    aria-label={`Stop ${comp.name}`}
                  >
                    <Icon name="stop" className="w-2.5 h-2.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => onStartComponent(comp.id)}
                    disabled={compBusy}
                    className="btn-icon text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-50"
                    title={`Start ${comp.name}`}
                    aria-label={`Start ${comp.name}`}
                  >
                    <Icon name="play" className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
