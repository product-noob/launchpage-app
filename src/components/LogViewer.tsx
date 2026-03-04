import { useState, useEffect, useRef, useMemo } from 'react'
import { getLineClass } from '../utils/format.ts'
import { Icon } from './Icon.tsx'

type LogLevel = 'all' | 'errors' | 'warnings'

interface LogViewerProps {
  appId: string
  appName: string
  onClose: () => void
}

export function LogViewer({ appId, appName, onClose }: LogViewerProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState<LogLevel>('all')
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLogs([])
    let mounted = true

    window.electronAPI.getLogs(appId).then(initialLines => {
      if (mounted) setLogs(initialLines)
    })

    const unsubscribe = window.electronAPI.onLogData((data) => {
      if (data.id !== appId) return
      setLogs(prev => {
        const next = [...prev, ...data.lines]
        return next.length > 500 ? next.slice(next.length - 500) : next
      })
    })

    return () => { mounted = false; unsubscribe() }
  }, [appId])

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

  const handleClear = async () => {
    await window.electronAPI.clearLogs(appId)
    setLogs([])
  }

  const handleCopy = async () => {
    const text = filteredLogs.join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filteredLogs = useMemo(() => {
    return logs.filter(line => {
      if (level === 'errors') {
        if (!line.includes('Error') && !line.includes('error') && !line.includes('ERROR') && !line.startsWith('[stderr]')) {
          return false
        }
      } else if (level === 'warnings') {
        if (!line.includes('Error') && !line.includes('error') && !line.includes('ERROR') &&
            !line.includes('Warning') && !line.includes('WARNING') && !line.includes('warn') &&
            !line.startsWith('[stderr]')) {
          return false
        }
      }
      if (search && !line.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      return true
    })
  }, [logs, search, level])

  const highlightSearch = (line: string): React.ReactNode => {
    if (!search) return line
    const idx = line.toLowerCase().indexOf(search.toLowerCase())
    if (idx === -1) return line
    return (
      <>
        {line.slice(0, idx)}
        <mark className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">{line.slice(idx, idx + search.length)}</mark>
        {line.slice(idx + search.length)}
      </>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
          title="Back"
          aria-label="Back to app list"
        >
          <Icon name="chevron-left" className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate block">{appName}</span>
          <span className="text-[10px] text-neutral-500 font-mono">{appId}</span>
        </div>
        <button
          onClick={handleCopy}
          className="text-[10px] text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
          title="Copy all logs"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={handleClear}
          className="text-[10px] text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Search & filter bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-neutral-200/50 dark:border-neutral-800/50 bg-neutral-50/50 dark:bg-neutral-900/50">
        <div className="flex-1 relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-600">
            <Icon name="search" className="w-3 h-3" />
          </span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="w-full text-[10px] pl-6 pr-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 placeholder-neutral-400 dark:placeholder-neutral-700 focus:border-neutral-400 dark:focus:border-neutral-600 focus:outline-none"
            aria-label="Search logs"
          />
        </div>
        <div className="flex gap-0.5 text-[9px]">
          {(['all', 'warnings', 'errors'] as LogLevel[]).map(l => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`px-1.5 py-0.5 rounded transition-colors capitalize ${
                level === l
                  ? 'bg-neutral-300 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
                  : 'text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-400'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Log output */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-[1.6] bg-neutral-50 dark:bg-neutral-950 select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8">
            {logs.length === 0 ? (
              <div className="space-y-1">
                <Icon name="terminal" className="w-6 h-6 mx-auto text-neutral-300 dark:text-neutral-700" />
                <p className="text-neutral-500 dark:text-neutral-600 text-[11px]">No logs yet.</p>
                <p className="text-neutral-400 dark:text-neutral-700 text-[10px]">Start the app to see output here.</p>
              </div>
            ) : (
              <p className="text-neutral-500 dark:text-neutral-600 text-[11px]">No matching log lines.</p>
            )}
          </div>
        ) : (
          filteredLogs.map((line, i) => (
            <div key={i} className={`whitespace-pre-wrap break-all ${getLineClass(line)}`}>
              {highlightSearch(line)}
            </div>
          ))
        )}
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true)
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
          }}
          className="absolute bottom-2 right-4 text-[10px] bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-1 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
        >
          Scroll to bottom
        </button>
      )}
    </div>
  )
}
