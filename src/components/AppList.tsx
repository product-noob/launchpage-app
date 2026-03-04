import { useState, useMemo, useRef, useCallback } from 'react'
import { useApps } from '../hooks/useApps.ts'
import { useKeyboardNav } from '../hooks/useKeyboardNav.ts'
import { AppCard } from './AppCard.tsx'
import { GroupedAppCard } from './GroupedAppCard.tsx'
import { SortableAppList, SortableItem } from './SortableAppList.tsx'
import { AppForm } from './AppForm.tsx'
import { LogViewer } from './LogViewer.tsx'
import { ProjectScanner } from './ProjectScanner.tsx'
import { ToastContainer } from './Toast.tsx'
import { AppListHeader } from './AppListHeader.tsx'
import { Icon } from './Icon.tsx'
import type { AppEntry } from '../types.ts'

export function AppList() {
  const {
    apps, statuses, loading, toasts,
    startApp, stopApp, restartApp, openInBrowser,
    addApp, updateApp, removeApp, getAppStatus, getAppError,
    startAll, stopAll, startComponent, stopComponent,
    isOperationPending, dismissToast, refreshApps,
  } = useApps()

  const handleReorder = useCallback(async (orderedIds: string[]) => {
    await window.electronAPI.reorderApps(orderedIds)
    await refreshApps()
  }, [refreshApps])

  const [view, setViewRaw] = useState<'list' | 'add' | 'logs' | 'edit' | 'scan'>('list')
  const [slideClass, setSlideClass] = useState('')
  const prevViewRef = useRef<typeof view>('list')

  const setView = useCallback((next: typeof view) => {
    const prev = prevViewRef.current
    if (next !== 'list' && prev === 'list') {
      setSlideClass('view-slide-in')
    } else if (next === 'list' && prev !== 'list') {
      setSlideClass('view-slide-back')
    } else {
      setSlideClass('')
    }
    prevViewRef.current = next
    setViewRaw(next)
  }, [])

  const [logTarget, setLogTarget] = useState<{ id: string; name: string } | null>(null)
  const [editTarget, setEditTarget] = useState<AppEntry | null>(null)
  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const searchInputRef = useRef<HTMLInputElement>(null)

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    for (const app of apps) {
      if (app.tags) app.tags.forEach(t => tags.add(t))
    }
    return Array.from(tags).sort()
  }, [apps])

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  const filtered = useMemo(() => {
    return apps.filter(app => {
      if (search && !app.name.toLowerCase().includes(search.toLowerCase())) return false
      if (selectedTags.size > 0) {
        const appTags = new Set(app.tags || [])
        for (const tag of selectedTags) {
          if (!appTags.has(tag)) return false
        }
      }
      return true
    })
  }, [apps, search, selectedTags])

  const runningCount = useMemo(() => apps.filter(app => getAppStatus(app) === 'running').length, [apps, getAppStatus])
  const errorCount = useMemo(() => apps.filter(app => getAppStatus(app) === 'error').length, [apps, getAppStatus])
  const hasRunning = runningCount > 0

  const handleKeySelect = useCallback((index: number) => {
    const app = filtered[index]
    if (!app) return
    const status = getAppStatus(app)
    if (status === 'running' || status === 'starting') stopApp(app.id)
    else startApp(app.id)
  }, [filtered, getAppStatus, startApp, stopApp])

  const { focusedIndex, resetFocus, listRef } = useKeyboardNav({
    itemCount: filtered.length,
    onSelect: handleKeySelect,
    onEscape: useCallback(() => {
      if (search) setSearch('')
      else if (document.activeElement === searchInputRef.current) searchInputRef.current?.blur()
    }, [search]),
    onCmdK: useCallback(() => {
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }, []),
    enabled: view === 'list',
  })

  if (loading) {
    return (
      <div className="flex flex-col h-full px-3 py-2 space-y-2">
        <div className="h-7 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 bg-neutral-200/50 dark:bg-neutral-800/50 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (view === 'add') {
    return (
      <div key="add" className={`h-full ${slideClass}`}>
        <AppForm mode="add" onSubmit={async (app) => { await addApp(app); setView('list') }} onCancel={() => setView('list')} />
      </div>
    )
  }

  if (view === 'edit' && editTarget) {
    return (
      <div key="edit" className={`h-full ${slideClass}`}>
        <AppForm
          mode="edit" app={editTarget}
          onSubmit={async (updates) => { await updateApp(editTarget.id, updates); setEditTarget(null); setView('list') }}
          onCancel={() => { setEditTarget(null); setView('list') }}
        />
      </div>
    )
  }

  if (view === 'logs' && logTarget) {
    return (
      <div key="logs" className={`h-full ${slideClass}`}>
        <LogViewer appId={logTarget.id} appName={logTarget.name} onClose={() => { setView('list'); setLogTarget(null) }} />
      </div>
    )
  }

  if (view === 'scan') {
    return (
      <div key="scan" className={`h-full ${slideClass}`}>
        <ProjectScanner
          onAddSelected={async (newApps) => { for (const app of newApps) await addApp(app); setView('list') }}
          onCancel={() => setView('list')}
        />
      </div>
    )
  }

  return (
    <div key="list" className={`flex flex-col h-full ${slideClass}`}>
      <AppListHeader
        search={search}
        onSearchChange={setSearch}
        searchInputRef={searchInputRef}
        runningCount={runningCount}
        errorCount={errorCount}
        hasRunning={hasRunning}
        allTags={allTags}
        selectedTags={selectedTags}
        onToggleTag={toggleTag}
        onStartAll={startAll}
        onStopAll={stopAll}
        onResetFocus={resetFocus}
        hasApps={apps.length > 0}
      />

      {/* App list */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {filtered.length === 0 && (
          <div className="text-center py-8">
            {search || selectedTags.size > 0 ? (
              <div className="text-neutral-500 dark:text-neutral-600 text-xs">No matching apps.</div>
            ) : (
              <div className="space-y-3">
                <Icon name="empty-box" className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-700" />
                <p className="text-neutral-500 dark:text-neutral-600 text-xs">No apps configured yet.</p>
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => setView('scan')}
                    className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-colors"
                  >
                    <Icon name="magnifying-glass-plus" className="w-3.5 h-3.5" />
                    Scan for projects
                  </button>
                  <span className="text-neutral-400 dark:text-neutral-700 text-[10px]">or click "Add App" below to add manually</span>
                </div>
              </div>
            )}
          </div>
        )}
        {(() => {
          const isFiltered = !!(search || selectedTags.size > 0)
          const cards = filtered.map((app, idx) => {
            const status = getAppStatus(app)
            const error = getAppError(app)
            const pending = isOperationPending(app.id)
            const focused = idx === focusedIndex
            const card = app.type === 'grouped' ? (
              <GroupedAppCard
                key={app.id} app={app} status={status} componentStatuses={statuses}
                pending={pending} focused={focused}
                onStart={() => startApp(app.id)} onStop={() => stopApp(app.id)}
                onRestart={() => restartApp(app.id)} onOpen={(port) => openInBrowser(port)}
                onRemove={() => removeApp(app.id)}
                onEdit={() => { setEditTarget(app); setView('edit') }}
                onViewLogs={(compId) => {
                  const comp = app.components?.find(c => c.id === compId)
                  setLogTarget({ id: compId, name: comp ? `${app.name} / ${comp.name}` : compId })
                  setView('logs')
                }}
                onStartComponent={startComponent} onStopComponent={stopComponent}
                isComponentPending={isOperationPending}
              />
            ) : (
              <AppCard
                key={app.id} app={app} status={status} error={error}
                pending={pending} focused={focused} statusInfo={statuses[app.id]}
                onStart={() => startApp(app.id)} onStop={() => stopApp(app.id)}
                onRestart={() => restartApp(app.id)}
                onOpen={() => { const p = statuses[app.id]?.port ?? app.port; if (p) openInBrowser(p) }}
                onRemove={() => removeApp(app.id)}
                onEdit={() => { setEditTarget(app); setView('edit') }}
                onViewLogs={() => { setLogTarget({ id: app.id, name: app.name }); setView('logs') }}
                onOpenTerminal={app.path ? () => window.electronAPI.openTerminal(app.id) : undefined}
              />
            )
            if (isFiltered) return card
            return <SortableItem key={app.id} id={app.id}>{card}</SortableItem>
          })
          if (isFiltered) return cards
          return (
            <SortableAppList ids={filtered.map(a => a.id)} onReorder={handleReorder}>
              {cards}
            </SortableAppList>
          )
        })()}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-neutral-200 dark:border-neutral-800 flex gap-2">
        <button
          onClick={() => setView('add')}
          className="flex-1 text-[11px] py-1.5 rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:border-sky-500/50 hover:text-sky-400 transition-colors"
        >
          + Add App
        </button>
        <button
          onClick={() => setView('scan')}
          className="text-[11px] py-1.5 px-2.5 rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:border-sky-500/50 hover:text-sky-400 transition-colors"
          title="Scan folders for projects"
        >
          <Icon name="magnifying-glass-plus" />
        </button>
        <button
          onClick={() => window.electronAPI.openConsole?.()}
          className="text-[11px] py-1.5 px-2.5 rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:border-sky-500/50 hover:text-sky-400 transition-colors"
          title="Open Management Console"
        >
          <Icon name="expand" />
        </button>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
