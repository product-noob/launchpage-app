import { AppList } from './components/AppList.tsx'
import ConsoleApp from './ConsoleApp.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { ThemeToggle } from './components/ThemeToggle.tsx'
import { Icon } from './components/Icon.tsx'
import { useTheme } from './hooks/useTheme.ts'

function TrayApp() {
  const { mode, cycleTheme } = useTheme()

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-xl overflow-hidden">
      {/* Draggable title bar */}
      <div
        className="h-8 flex-shrink-0 flex items-center justify-between px-3 border-b border-neutral-200 dark:border-neutral-800"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <button
          onClick={() => window.electronAPI.quitApp()}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          title="Quit Launchpad (stops all running apps)"
        >
          <Icon name="power" className="w-3 h-3" />
          <span className="text-[9px] font-medium">Quit</span>
        </button>
        <span className="text-[10px] font-bold text-neutral-500 tracking-[0.2em] uppercase">Launchpad</span>
        <ThemeToggle mode={mode} onCycle={cycleTheme} noDrag />
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 relative">
        <ErrorBoundary>
          <AppList />
        </ErrorBoundary>
      </div>
    </div>
  )
}

function App() {
  const isConsole = window.location.hash.startsWith('#/console')
  if (isConsole) {
    return <ConsoleApp />
  }
  return <TrayApp />
}

export default App
