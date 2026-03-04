import { useState, useEffect, useCallback } from 'react'
import { Icon } from './Icon.tsx'
import { getTypeClasses } from '../typeRegistry.ts'
import { ScanConfigurePhase, CheckboxIcon } from './ScanConfigurePhase.tsx'
import type { DiscoveredProject, AppEntry } from '../types.ts'

interface ProjectScannerProps {
  onAddSelected: (apps: AppEntry[]) => Promise<void>
  onCancel: () => void
}

type ScanPhase = 'configure' | 'scanning' | 'results'

export function ProjectScanner({ onAddSelected, onCancel }: ProjectScannerProps) {
  const [phase, setPhase] = useState<ScanPhase>('configure')
  const [defaultDirs, setDefaultDirs] = useState<string[]>([])
  const [selectedDirs, setSelectedDirs] = useState<Set<string>>(new Set())
  const [customDirs, setCustomDirs] = useState<string[]>([])
  const [results, setResults] = useState<DiscoveredProject[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    window.electronAPI.getScanDefaults().then(r => {
      if (r.ok && r.data) {
        setDefaultDirs(r.data)
        setSelectedDirs(new Set(r.data))
      }
    })
  }, [])

  const toggleDir = useCallback((dir: string) => {
    setSelectedDirs(prev => {
      const next = new Set(prev)
      if (next.has(dir)) next.delete(dir)
      else next.add(dir)
      return next
    })
  }, [])

  const addCustomFolder = useCallback(async () => {
    const result = await window.electronAPI.selectScanFolders()
    if (result.ok && result.data && result.data.length > 0) {
      setCustomDirs(prev => {
        const existing = new Set(prev)
        const newDirs = result.data!.filter(d => !existing.has(d))
        return [...prev, ...newDirs]
      })
      setSelectedDirs(prev => {
        const next = new Set(prev)
        for (const d of result.data!) next.add(d)
        return next
      })
    }
  }, [])

  const removeCustomDir = useCallback((dir: string) => {
    setCustomDirs(prev => prev.filter(d => d !== dir))
    setSelectedDirs(prev => {
      const next = new Set(prev)
      next.delete(dir)
      return next
    })
  }, [])

  const startScan = useCallback(async () => {
    const dirs = Array.from(selectedDirs)
    if (dirs.length === 0) return

    setPhase('scanning')
    setError(null)
    setResults([])
    setSelected(new Set())

    const result = await window.electronAPI.scanProjects(dirs)
    if (result.ok && result.data) {
      setResults(result.data)
      setSelected(new Set(result.data.map(p => p.id)))
      setPhase('results')
    } else {
      setError(result.error || 'Scan failed')
      setPhase('configure')
    }
  }, [selectedDirs])

  const toggleProject = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (selected.size === results.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(results.map(p => p.id)))
    }
  }, [selected.size, results])

  const handleAdd = useCallback(async () => {
    const toAdd = results.filter(p => selected.has(p.id))
    if (toAdd.length === 0) return

    setAdding(true)
    const apps: AppEntry[] = toAdd.map(p => ({
      id: p.id, name: p.name, type: p.type,
      path: p.path, command: p.command, port: p.port,
    }))
    await onAddSelected(apps)
    setAdding(false)
  }, [results, selected, onAddSelected])

  const shortenPath = (p: string) =>
    p.replace(/^\/(?:Users|home)\/[^/]+/, '~')
     .replace(/^[A-Z]:\\Users\\[^\\]+/i, '~')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
        <button onClick={onCancel} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200" aria-label="Back">
          <Icon name="chevron-left" className="w-4 h-4" />
        </button>
        <Icon name="magnifying-glass-plus" className="w-4 h-4 text-sky-400" />
        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
          {phase === 'results' ? `Found ${results.length} project${results.length !== 1 ? 's' : ''}` : 'Scan for Projects'}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {phase === 'configure' && (
          <ScanConfigurePhase
            defaultDirs={defaultDirs}
            customDirs={customDirs}
            selectedDirs={selectedDirs}
            error={error}
            onToggleDir={toggleDir}
            onAddCustom={addCustomFolder}
            onRemoveCustom={removeCustomDir}
          />
        )}

        {phase === 'scanning' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-neutral-500">Scanning directories...</p>
            <p className="text-[10px] text-neutral-600 dark:text-neutral-600">Looking for package.json, pyproject.toml, Cargo.toml, go.mod...</p>
          </div>
        )}

        {phase === 'results' && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Icon name="search" className="w-8 h-8 text-neutral-300 dark:text-neutral-700" />
            <p className="text-xs text-neutral-500">No new projects found.</p>
            <p className="text-[10px] text-neutral-600 dark:text-neutral-600">All detected projects are already in your list.</p>
            <button
              onClick={() => setPhase('configure')}
              className="mt-2 text-[11px] text-sky-400 hover:text-sky-300 transition-colors"
            >
              Scan different folders
            </button>
          </div>
        )}

        {phase === 'results' && results.length > 0 && (
          <ScanResultsList
            results={results}
            selected={selected}
            onToggleProject={toggleProject}
            onToggleAll={toggleAll}
            onRescan={() => setPhase('configure')}
            shortenPath={shortenPath}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-neutral-200 dark:border-neutral-800 flex gap-2">
        <button onClick={onCancel} className="btn-secondary flex-1 py-1.5 text-[12px]">Cancel</button>
        {phase === 'configure' && (
          <button
            onClick={startScan}
            disabled={selectedDirs.size === 0}
            className="flex-1 text-[12px] font-medium py-1.5 rounded-md bg-sky-500 text-white hover:bg-sky-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Scan
          </button>
        )}
        {phase === 'results' && results.length > 0 && (
          <button
            onClick={handleAdd}
            disabled={selected.size === 0 || adding}
            className="flex-1 text-[12px] font-medium py-1.5 rounded-md bg-sky-500 text-white hover:bg-sky-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {adding ? 'Adding...' : `Add ${selected.size} App${selected.size !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>
    </div>
  )
}

function ScanResultsList({
  results, selected, onToggleProject, onToggleAll, onRescan, shortenPath,
}: {
  results: DiscoveredProject[]
  selected: Set<string>
  onToggleProject: (id: string) => void
  onToggleAll: () => void
  onRescan: () => void
  shortenPath: (p: string) => string
}) {
  return (
    <div className="px-3 py-2 space-y-1">
      <button
        onClick={onToggleAll}
        className="flex items-center gap-2 w-full text-left px-2 py-1 text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
      >
        <CheckboxIcon checked={selected.size === results.length} indeterminate={selected.size > 0 && selected.size < results.length} />
        <span>
          {selected.size === results.length ? 'Deselect all' : 'Select all'}
          {selected.size > 0 && ` (${selected.size} selected)`}
        </span>
      </button>

      {results.map(project => (
        <button
          key={project.id}
          onClick={() => onToggleProject(project.id)}
          className={`w-full text-left flex items-start gap-2.5 px-2 py-2 rounded-lg border transition-colors ${
            selected.has(project.id)
              ? 'border-sky-500/30 bg-sky-500/5'
              : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
          }`}
        >
          <div className="pt-0.5 shrink-0">
            <CheckboxIcon checked={selected.has(project.id)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-neutral-800 dark:text-neutral-200 truncate">{project.name}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${getTypeClasses(project.type)}`}>
                {project.framework}
              </span>
            </div>
            <p className="text-[10px] text-neutral-500 truncate mt-0.5" title={project.path}>
              {shortenPath(project.path)}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[9px] font-mono text-neutral-600 dark:text-neutral-500">{project.command}</span>
              {project.port && (
                <span className="text-[9px] font-mono text-neutral-600 dark:text-neutral-600">:{project.port}</span>
              )}
            </div>
          </div>
        </button>
      ))}

      <button
        onClick={onRescan}
        className="w-full mt-1 text-[10px] text-sky-400 hover:text-sky-300 transition-colors py-1"
      >
        Scan different folders
      </button>
    </div>
  )
}
