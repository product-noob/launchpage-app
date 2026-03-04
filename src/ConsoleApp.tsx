import { useState, useCallback } from 'react'
import { useTheme } from './hooks/useTheme.ts'
import { useHashRoute } from './hooks/useHashRoute.ts'
import { ThemeToggle } from './components/ThemeToggle.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { Icon } from './components/Icon.tsx'
import type { IconName } from './components/Icon.tsx'
import { ToastContainer } from './components/Toast.tsx'
import { DashboardTab } from './console/DashboardTab.tsx'
import { AppsTab } from './console/AppsTab.tsx'
import { LogsTab } from './console/LogsTab.tsx'
import { ConfigTab } from './console/ConfigTab.tsx'
import { SettingsTab } from './console/SettingsTab.tsx'
import { ConsoleDataContext, useConsoleDataValue } from './hooks/useConsoleData.ts'

type ConsoleTab = 'dashboard' | 'apps' | 'logs' | 'config' | 'settings'

const CONSOLE_TABS = ['dashboard', 'apps', 'logs', 'config', 'settings'] as const

const tabs: { id: ConsoleTab; label: string; icon: IconName }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'apps', label: 'Apps', icon: 'servers' },
  { id: 'logs', label: 'Logs', icon: 'terminal' },
  { id: 'config', label: 'Config', icon: 'code' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

function ConsoleApp() {
  const { route: activeTab, setRoute: setActiveTab } = useHashRoute(CONSOLE_TABS, 'dashboard')
  const { mode, cycleTheme } = useTheme()
  const consoleData = useConsoleDataValue()
  const [logsInitialAppId, setLogsInitialAppId] = useState<string | undefined>()

  const navigateToLogs = useCallback((appId: string) => {
    setLogsInitialAppId(appId)
    setActiveTab('logs')
  }, [setActiveTab])

  return (
    <ConsoleDataContext.Provider value={consoleData}>
      <div className="h-screen flex bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 relative">
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-neutral-50 dark:bg-neutral-950">
          {/* Title bar area — taller on macOS to clear traffic lights */}
          <div
            className={`${window.electronAPI.platform === 'darwin' ? 'h-12' : 'h-9'} flex items-end pb-1 px-4`}
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          >
            <span className="text-[11px] font-bold text-neutral-500 tracking-[0.15em] uppercase">Launchpad</span>
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-2 py-2 space-y-0.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                  activeTab === tab.id
                    ? 'bg-sky-500/10 text-sky-500 font-medium'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50'
                }`}
              >
                <Icon name={tab.icon} className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Bottom controls */}
          <div className="px-3 py-3 border-t border-neutral-200 dark:border-neutral-800">
            <ThemeToggle mode={mode} onCycle={cycleTheme} />
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top drag bar for macOS window controls */}
          <div className="h-12 flex-shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />

          {/* Tab content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ErrorBoundary>
              {activeTab === 'dashboard' && <DashboardTab onNavigateToLogs={navigateToLogs} />}
              {activeTab === 'apps' && <AppsTab onNavigateToLogs={navigateToLogs} />}
              {activeTab === 'logs' && <LogsTab initialAppId={logsInitialAppId} />}
              {activeTab === 'config' && <ConfigTab />}
              {activeTab === 'settings' && <SettingsTab />}
            </ErrorBoundary>
          </div>
        </div>

        {/* Toast notifications */}
        <ToastContainer toasts={consoleData.toasts} onDismiss={consoleData.dismissToast} />
      </div>
    </ConsoleDataContext.Provider>
  )
}

export default ConsoleApp
