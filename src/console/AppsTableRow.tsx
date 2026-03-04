import { getTypeClasses } from '../typeRegistry.ts'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { Icon } from '../components/Icon.tsx'
import { OverflowMenu } from '../components/OverflowMenu.tsx'
import type { MenuAction } from '../components/OverflowMenu.tsx'
import { formatUptime } from '../utils/format.ts'
import type { AppEntry } from '../types.ts'

interface AppRowProps {
  app: AppEntry
  status: string
  isRunning: boolean
  runtimePort: number | undefined
  info: { startedAt?: number } | undefined
  error: string | undefined
  isGrouped: boolean
  isExpanded: boolean
  menuItems: MenuAction[]
  onToggleExpand: () => void
  onStart: () => void
  onStop: () => void
  onOpen: (port: number) => void
  statuses: Record<string, { status?: string; error?: string; port?: number }>
  components: AppEntry['components']
  onNavigateToLogs?: (appId: string) => void
  onStartComponent: (id: string) => void
  onStopComponent: (id: string) => void
  isComponentPending: (id: string) => boolean
}

export function AppRow({
  app, status, isRunning, runtimePort, info, error,
  isGrouped, isExpanded, menuItems, onToggleExpand,
  onStart, onStop, onOpen, statuses, components,
  onNavigateToLogs, onStartComponent, onStopComponent, isComponentPending,
}: AppRowProps) {
  return (
    <>
      <tr className={`border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 ${isGrouped ? 'cursor-pointer' : ''}`}>
        <td className="py-2.5 pr-2">
          <div className="flex items-center gap-1">
            {isGrouped && (
              <button onClick={onToggleExpand} className="p-0.5">
                <Icon
                  name="chevron-right"
                  className={`w-3 h-3 text-neutral-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              </button>
            )}
            <StatusBadge status={status as 'stopped' | 'starting' | 'running' | 'error'} />
          </div>
        </td>
        <td className="py-2.5 pr-4" onClick={isGrouped ? onToggleExpand : undefined}>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium">{app.name}</span>
            {app.autoStart && (
              <span className="text-[8px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                AUTO
              </span>
            )}
            {isGrouped && components && (
              <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${getTypeClasses('grouped')}`}>
                {components.length} services
              </span>
            )}
          </div>
          {app.tags && app.tags.length > 0 && (
            <div className="flex gap-1 mt-0.5">
              {app.tags.map(t => (
                <span key={t} className="text-[8px] px-1 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-500">{t}</span>
              ))}
            </div>
          )}
          {error && (
            <p className="text-[10px] text-red-400 mt-0.5 truncate max-w-[300px]" title={error}>{error}</p>
          )}
        </td>
        <td className="py-2.5 pr-4">
          {!isGrouped && (
            <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${getTypeClasses(app.type)}`}>
              {app.type}
            </span>
          )}
        </td>
        <td className="py-2.5 pr-4 text-xs capitalize">{status}</td>
        <td className="py-2.5 pr-4 text-xs font-mono text-neutral-500">
          {!runtimePort ? '-' : isRunning ? (
            <button onClick={() => onOpen(runtimePort)} className="text-sky-400 hover:text-sky-300">{runtimePort}</button>
          ) : runtimePort}
        </td>
        <td className="py-2.5 pr-4 text-xs text-neutral-500">{isRunning ? formatUptime(info?.startedAt) : '-'}</td>
        <td className="py-2.5">
          <div className="flex items-center gap-1">
            {isRunning ? (
              <button onClick={onStop} className="btn-action-stop" title="Stop">
                <Icon name="stop" className="w-3 h-3" />
              </button>
            ) : (
              <button onClick={onStart} className="btn-action-start" title="Start">
                <Icon name="play" className="w-3 h-3" />
              </button>
            )}
            <OverflowMenu items={menuItems} width="w-44" />
          </div>
        </td>
      </tr>
      {/* Expanded component rows for grouped apps */}
      {isGrouped && isExpanded && components?.map(comp => {
        const compStatus = (statuses[comp.id]?.status || 'stopped') as 'stopped' | 'starting' | 'running' | 'error'
        const compRunning = compStatus === 'running' || compStatus === 'starting'
        const compError = statuses[comp.id]?.error
        const compPort = statuses[comp.id]?.port ?? comp.port
        const compPending = isComponentPending(comp.id)

        return (
          <tr key={comp.id} className="border-b border-neutral-100 dark:border-neutral-800/50 bg-neutral-50/50 dark:bg-neutral-900/30">
            <td className="py-1.5 pr-2 pl-6">
              <StatusBadge status={compStatus} />
            </td>
            <td className="py-1.5 pr-4">
              <span className="text-xs text-neutral-600 dark:text-neutral-400">{comp.name}</span>
              {compError && (
                <p className="text-[9px] text-red-400 truncate max-w-[200px]" title={compError}>{compError}</p>
              )}
            </td>
            <td className="py-1.5 pr-4">
              <span className={`text-[8px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded ${getTypeClasses(comp.type)}`}>
                {comp.type}
              </span>
            </td>
            <td className="py-1.5 pr-4 text-[11px] capitalize text-neutral-500">{compStatus}</td>
            <td className="py-1.5 pr-4 text-[11px] font-mono text-neutral-500">
              {compRunning && compPort ? (
                <button onClick={() => onOpen(compPort)} className="text-sky-400 hover:text-sky-300">{compPort}</button>
              ) : compPort || '-'}
            </td>
            <td className="py-1.5 pr-4" />
            <td className="py-1.5">
              <div className="flex items-center gap-1">
                {onNavigateToLogs && (
                  <button
                    onClick={() => onNavigateToLogs(comp.id)}
                    className="btn-icon text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                    title={`Logs: ${comp.name}`}
                  >
                    <Icon name="terminal" className="w-3 h-3" />
                  </button>
                )}
                {compRunning ? (
                  <button
                    onClick={() => onStopComponent(comp.id)}
                    disabled={compPending}
                    className="btn-icon text-red-400 hover:bg-red-400/10 disabled:opacity-50"
                    title={`Stop ${comp.name}`}
                  >
                    <Icon name="stop" className="w-2.5 h-2.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => onStartComponent(comp.id)}
                    disabled={compPending}
                    className="btn-icon text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-50"
                    title={`Start ${comp.name}`}
                  >
                    <Icon name="play" className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </td>
          </tr>
        )
      })}
    </>
  )
}
