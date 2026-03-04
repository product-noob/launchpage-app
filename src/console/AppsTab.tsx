import { useState, useMemo, useCallback } from 'react'
import { Icon } from '../components/Icon.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { AppForm } from '../components/AppForm.tsx'
import { ProjectScanner } from '../components/ProjectScanner.tsx'
import { useConsoleData } from '../hooks/useConsoleData.ts'
import { AppRow } from './AppsTableRow.tsx'
import type { AppEntry } from '../types.ts'
import type { MenuAction } from '../components/OverflowMenu.tsx'

type SortKey = 'name' | 'type' | 'status' | 'port'
type ModalView = null | 'add' | 'scan' | { type: 'edit'; app: AppEntry }

interface AppsTabProps {
  onNavigateToLogs?: (appId: string) => void
}

export function AppsTab({ onNavigateToLogs }: AppsTabProps) {
  const {
    apps, statuses, getStatus, startApp, stopApp, restartApp,
    openInBrowser, removeApp, openTerminal, addApp, updateApp,
    startComponent, stopComponent, isOperationPending, getAppError,
  } = useConsoleData()

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string } | null>(null)
  const [modalView, setModalView] = useState<ModalView>(null)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = useMemo(() => {
    let list = apps
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.type.includes(q) || (a.tags || []).some(t => t.toLowerCase().includes(q)))
    }
    list = [...list].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'type': cmp = a.type.localeCompare(b.type); break
        case 'status': cmp = getStatus(a).localeCompare(getStatus(b)); break
        case 'port': cmp = (a.port || 0) - (b.port || 0); break
      }
      return sortAsc ? cmp : -cmp
    })
    return list
  }, [apps, search, sortKey, sortAsc, getStatus])

  const handleOpen = useCallback((port: number) => { openInBrowser(port) }, [openInBrowser])

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button onClick={() => handleSort(field)} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
      {label}
      {sortKey === field && (
        <span className="text-sky-400">{sortAsc ? '\u25B2' : '\u25BC'}</span>
      )}
    </button>
  )

  // Modal overlays
  if (modalView === 'add') {
    return (
      <div className="h-full">
        <AppForm mode="add" onSubmit={async (app) => { await addApp(app); setModalView(null) }} onCancel={() => setModalView(null)} />
      </div>
    )
  }

  if (modalView === 'scan') {
    return (
      <div className="h-full">
        <ProjectScanner
          onAddSelected={async (newApps) => { for (const app of newApps) await addApp(app); setModalView(null) }}
          onCancel={() => setModalView(null)}
        />
      </div>
    )
  }

  if (modalView && typeof modalView === 'object' && modalView.type === 'edit') {
    return (
      <div className="h-full">
        <AppForm
          mode="edit" app={modalView.app}
          onSubmit={async (updates) => { await updateApp(modalView.app.id, updates); setModalView(null) }}
          onCancel={() => setModalView(null)}
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search apps by name, type, or tag..."
          className="input-field max-w-md"
        />
        <div className="flex-1" />
        <button
          onClick={() => setModalView('scan')}
          className="text-[11px] px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:border-sky-500/50 hover:text-sky-400 transition-colors flex items-center gap-1.5"
        >
          <Icon name="magnifying-glass-plus" className="w-3.5 h-3.5" />
          Scan
        </button>
        <button
          onClick={() => setModalView('add')}
          className="text-[11px] px-3 py-1.5 rounded-md bg-sky-500 text-white hover:bg-sky-400 transition-colors"
        >
          + Add App
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-3">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800">
              <th className="pb-2 pr-4 w-6"></th>
              <th className="pb-2 pr-4"><SortHeader label="Name" field="name" /></th>
              <th className="pb-2 pr-4"><SortHeader label="Type" field="type" /></th>
              <th className="pb-2 pr-4"><SortHeader label="Status" field="status" /></th>
              <th className="pb-2 pr-4"><SortHeader label="Port" field="port" /></th>
              <th className="pb-2 pr-4 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Uptime</th>
              <th className="pb-2 w-24 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(app => {
              const status = getStatus(app)
              const isRunning = status === 'running' || status === 'starting'
              const info = statuses[app.id]
              const runtimePort = statuses[app.id]?.port || app.port
              const isGrouped = app.type === 'grouped' && !!app.components
              const error = getAppError(app)

              const menuItems: MenuAction[] = [
                { icon: 'external-link', label: 'Open in Browser', onClick: () => handleOpen(runtimePort!), visible: isRunning && !!runtimePort },
                { icon: 'terminal', label: 'View Logs', onClick: () => onNavigateToLogs?.(isGrouped && app.components?.length ? app.components[0].id : app.id), visible: !!onNavigateToLogs },
                { icon: 'restart', label: 'Restart', onClick: () => restartApp(app.id), visible: isRunning },
                { icon: 'terminal-prompt', label: 'Open Terminal', onClick: () => openTerminal(app.id), visible: !!app.path },
                { icon: 'edit', label: 'Edit', onClick: () => setModalView({ type: 'edit', app }) },
                { icon: 'trash', label: 'Remove', onClick: () => setConfirmTarget({ id: app.id, name: app.name }), danger: true },
              ]

              return (
                <AppRow
                  key={app.id}
                  app={app} status={status} isRunning={isRunning} runtimePort={runtimePort}
                  info={info} error={error} isGrouped={isGrouped}
                  isExpanded={expanded.has(app.id)} menuItems={menuItems}
                  onToggleExpand={() => toggleExpand(app.id)}
                  onStart={() => startApp(app.id)} onStop={() => stopApp(app.id)}
                  onOpen={handleOpen} statuses={statuses} components={app.components}
                  onNavigateToLogs={onNavigateToLogs}
                  onStartComponent={startComponent} onStopComponent={stopComponent}
                  isComponentPending={isOperationPending}
                />
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-neutral-500 text-sm">No apps found.</div>
        )}
      </div>

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
