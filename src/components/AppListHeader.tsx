import { Icon } from './Icon.tsx'

interface AppListHeaderProps {
  search: string
  onSearchChange: (value: string) => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
  runningCount: number
  errorCount: number
  hasRunning: boolean
  allTags: string[]
  selectedTags: Set<string>
  onToggleTag: (tag: string) => void
  onStartAll: () => void
  onStopAll: () => void
  onResetFocus: () => void
  hasApps: boolean
}

export function AppListHeader({
  search, onSearchChange, searchInputRef,
  runningCount, errorCount, hasRunning,
  allTags, selectedTags, onToggleTag,
  onStartAll, onStopAll, onResetFocus, hasApps,
}: AppListHeaderProps) {
  return (
    <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500">
            <Icon name="search" className="w-3 h-3" />
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={e => { onSearchChange(e.target.value); onResetFocus() }}
            placeholder="Filter apps... ⌘K"
            className="w-full text-[11px] pl-7 pr-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 placeholder-neutral-400 dark:placeholder-neutral-600 focus:border-neutral-400 dark:focus:border-neutral-600 focus:outline-none"
            aria-label="Filter apps (⌘K)"
          />
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {runningCount > 0 && (
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {runningCount}
            </span>
          )}
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {errorCount}
            </span>
          )}
        </div>
        {hasApps && (
          <div className="flex items-center gap-1">
            {hasRunning ? (
              <button
                onClick={onStopAll}
                className="text-[9px] px-1.5 py-0.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                title="Stop all apps"
              >
                Stop All
              </button>
            ) : (
              <button
                onClick={onStartAll}
                className="text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                title="Start all apps"
              >
                Start All
              </button>
            )}
          </div>
        )}
      </div>
      {/* Tag filter chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => onToggleTag(tag)}
              className={`text-[9px] px-1.5 py-0.5 rounded-full border transition-colors ${
                selectedTags.has(tag)
                  ? 'border-sky-500 bg-sky-500/15 text-sky-400'
                  : 'border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-500 hover:border-neutral-400 dark:hover:border-neutral-600'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
