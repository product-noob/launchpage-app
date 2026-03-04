import type { AppEntry, AppStatus, StatusInfo } from '../types.ts'
import { StatusBadge } from './StatusBadge.tsx'
import { Icon } from './Icon.tsx'
import { OverflowMenu } from './OverflowMenu.tsx'
import type { MenuAction } from './OverflowMenu.tsx'
import { getTypeClasses } from '../typeRegistry.ts'
import { formatUptime } from '../utils/format.ts'
import { statusColors } from '../tokens.ts'

interface AppCardProps {
  app: AppEntry
  status: AppStatus
  error?: string
  pending?: boolean
  focused?: boolean
  statusInfo?: StatusInfo
  onStart: () => void
  onStop: () => void
  onRestart: () => void
  onOpen: () => void
  onRemove: () => void
  onEdit: () => void
  onViewLogs: () => void
  onOpenTerminal?: () => void
}

export function AppCard({ app, status, error, pending, focused, statusInfo, onStart, onStop, onRestart, onOpen, onRemove, onEdit, onViewLogs, onOpenTerminal }: AppCardProps) {
  const isRunning = status === 'running'
  const isBusy = status === 'starting' || !!pending
  const isError = status === 'error'
  const style = getTypeClasses(app.type)
  const activePort = statusInfo?.port ?? app.port

  const menuItems: MenuAction[] = [
    { icon: 'terminal', label: 'View Logs', onClick: onViewLogs },
    { icon: 'restart', label: 'Restart', onClick: onRestart, visible: isRunning || status === 'starting' },
    { icon: 'terminal-prompt', label: 'Open Terminal', onClick: onOpenTerminal!, visible: !!onOpenTerminal },
    { icon: 'edit', label: 'Edit', onClick: onEdit },
    { icon: 'trash', label: 'Remove', onClick: onRemove, danger: true },
  ]

  return (
    <div
      data-app-card
      className={`group rounded-lg border px-3 py-2 transition-all cursor-default ${statusColors[status].cardBorder} ${focused ? 'ring-1 ring-sky-500/50' : ''}`}
    >
      <div className="flex items-center gap-2.5">
        <StatusBadge status={status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100 truncate">{app.name}</span>
            <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${style}`}>
              {app.type}
            </span>
            {app.autoStart && (
              <span className="text-[8px] text-neutral-400 dark:text-neutral-600" title="Auto-starts on launch">AUTO</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isRunning && activePort && (
              <span className="text-[10px] text-neutral-500 font-mono">localhost:{activePort}</span>
            )}
            {isRunning && statusInfo?.startedAt && (
              <span className="text-[10px] text-neutral-400 dark:text-neutral-600">{formatUptime(statusInfo.startedAt)}</span>
            )}
          </div>
          {isError && error && (
            <span className="text-[10px] text-red-400 block mt-0.5 leading-tight" title={error}>
              {error.length > 60 ? error.slice(0, 60) + '...' : error}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isRunning && activePort && (
            <button onClick={onOpen} className="btn-icon text-sky-400 hover:bg-sky-400/10" title="Open in browser" aria-label="Open in browser">
              <Icon name="external-link" />
            </button>
          )}
          {isRunning || status === 'starting' ? (
            <button onClick={onStop} disabled={isBusy} className="btn-action-stop disabled:opacity-50" title="Stop" aria-label="Stop">
              <Icon name="stop" className="w-3 h-3" />
            </button>
          ) : (
            <button onClick={onStart} disabled={isBusy} className="btn-action-start disabled:opacity-50" title="Start" aria-label="Start">
              <Icon name="play" className="w-3 h-3" />
            </button>
          )}
          <OverflowMenu items={menuItems} />
        </div>
      </div>
    </div>
  )
}
