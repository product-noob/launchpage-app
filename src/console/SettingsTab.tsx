import { useTheme } from '../hooks/useTheme.ts'
import type { ThemeMode } from '../hooks/useTheme.ts'

const themeOptions: { value: ThemeMode; label: string; desc: string }[] = [
  { value: 'dark', label: 'Dark', desc: 'Always dark' },
  { value: 'light', label: 'Light', desc: 'Always light' },
  { value: 'system', label: 'System', desc: 'Follow system' },
]

export function SettingsTab() {
  const { mode, setMode } = useTheme()

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8 max-w-2xl">
      {/* Theme */}
      <Section title="Appearance">
        <div>
          <div className="text-sm font-medium mb-2">Theme</div>
          <div className="flex gap-2">
            {themeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setMode(opt.value)}
                className={`flex-1 px-3 py-2 rounded-lg border text-xs transition-colors ${
                  mode === opt.value
                    ? 'border-sky-500 bg-sky-500/10 text-sky-400'
                    : 'border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600'
                }`}
              >
                <div className="font-medium">{opt.label}</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Keyboard Shortcut */}
      <Section title="Keyboard Shortcut">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Toggle Launchpad</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">Show/hide the tray dropdown from anywhere</div>
          </div>
          <kbd className="text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
            {window.electronAPI.platform === 'darwin' ? '\u2318' : 'Ctrl'}+Shift+L
          </kbd>
        </div>
      </Section>

      {/* Import / Export */}
      <Section title="Configuration">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Export Configuration</div>
              <div className="text-[11px] text-neutral-500 mt-0.5">Save your apps.json to a file</div>
            </div>
            <button
              onClick={() => window.electronAPI.exportConfig()}
              className="text-xs px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
            >
              Export
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Import Configuration</div>
              <div className="text-[11px] text-neutral-500 mt-0.5">Load apps from a JSON file</div>
            </div>
            <button
              onClick={() => window.electronAPI.importConfig()}
              className="text-xs px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
            >
              Import
            </button>
          </div>
        </div>
      </Section>

      {/* About */}
      <Section title="About">
        <div className="text-sm text-neutral-500 dark:text-neutral-400 space-y-1">
          <p><span className="font-medium text-neutral-700 dark:text-neutral-300">Launchpad</span> — Local dev app launcher</p>
          <p>Electron {window.electronAPI.platform === 'darwin' ? 'macOS' : window.electronAPI.platform === 'win32' ? 'Windows' : window.electronAPI.platform}</p>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">{title}</h2>
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-4">
        {children}
      </div>
    </div>
  )
}
