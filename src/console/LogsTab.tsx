import { useState, useEffect, useRef, useMemo } from 'react'
import { getLineClass } from '../utils/format.ts'
import { useConsoleData } from '../hooks/useConsoleData.ts'

interface LogsTabProps {
  initialAppId?: string
}

export function LogsTab({ initialAppId }: LogsTabProps) {
  const { apps } = useConsoleData()
  const [selectedAppId, setSelectedAppId] = useState<string>(initialAppId || '')
  const [logs, setLogs] = useState<string[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Select app from cross-tab navigation or auto-select first on load
  useEffect(() => {
    if (initialAppId) {
      setSelectedAppId(initialAppId)
    } else if (apps.length > 0 && !selectedAppId) {
      const first = apps[0]
      setSelectedAppId(first.type === 'grouped' && first.components?.length ? first.components[0].id : first.id)
    }
  }, [apps, selectedAppId, initialAppId])

  useEffect(() => {
    if (!selectedAppId) return
    setLogs([])
    let mounted = true

    window.electronAPI.getLogs(selectedAppId).then(initialLines => {
      if (mounted) setLogs(initialLines)
    })

    const unsubscribe = window.electronAPI.onLogData((data) => {
      if (data.id !== selectedAppId) return
      setLogs(prev => {
        const next = [...prev, ...data.lines]
        return next.length > 500 ? next.slice(next.length - 500) : next
      })
    })

    return () => { mounted = false; unsubscribe() }
  }, [selectedAppId])

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40)
  }

  const filteredLogs = useMemo(() => {
    if (!search) return logs
    const q = search.toLowerCase()
    return logs.filter(line => line.toLowerCase().includes(q))
  }, [logs, search])

  const selectableApps: { id: string; label: string }[] = []
  for (const app of apps) {
    if (app.type === 'grouped' && app.components) {
      for (const comp of app.components) {
        selectableApps.push({ id: comp.id, label: `${app.name} / ${comp.name}` })
      }
    } else {
      selectableApps.push({ id: app.id, label: app.name })
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(filteredLogs.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="px-6 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
        <select
          value={selectedAppId}
          onChange={e => { setSelectedAppId(e.target.value); setLogs([]) }}
          className="input-field max-w-xs"
        >
          <option value="">Select app...</option>
          {selectableApps.map(a => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search logs..."
          className="input-field max-w-xs"
        />
        <div className="flex-1" />
        <button
          onClick={handleCopy}
          className="text-[11px] text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 px-2.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={() => selectedAppId && window.electronAPI.clearLogs(selectedAppId).then(() => setLogs([]))}
          className="text-[11px] text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 px-2.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Log output */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-3 font-mono text-[12px] leading-[1.6] bg-neutral-50 dark:bg-neutral-950 select-text"
      >
        {!selectedAppId ? (
          <div className="text-center py-12 text-neutral-500 text-sm">Select an app to view logs.</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-neutral-500 text-sm">
            {logs.length === 0 ? 'No logs yet. Start the app to see output.' : 'No matching log lines.'}
          </div>
        ) : (
          filteredLogs.map((line, i) => (
            <div key={i} className={`whitespace-pre-wrap break-all ${getLineClass(line)}`}>
              {line}
            </div>
          ))
        )}
      </div>

      {/* Scroll indicator */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true)
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
          }}
          className="absolute bottom-4 right-8 text-[11px] bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-3 py-1 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
        >
          Scroll to bottom
        </button>
      )}
    </div>
  )
}
